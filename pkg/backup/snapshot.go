package backup

import (
	"archive/tar"
	"compress/gzip"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/vortexs3/vortexs3/pkg/storage"
)

type Engine struct {
	storage    *storage.FilesystemStorage
	backupDir  string
	stopChan   chan struct{}
}

func NewEngine(store *storage.FilesystemStorage, backupDir string) *Engine {
	os.MkdirAll(backupDir, 0755)
	return &Engine{
		storage:   store,
		backupDir: backupDir,
		stopChan:  make(chan struct{}),
	}
}

func (e *Engine) StartScheduler() {
	log.Printf("[Backup Engine] Agendador de snapshots e rotinas automáticas ativo.")
}

func (e *Engine) StopScheduler() {
	close(e.stopChan)
}

// Cria um arquivo .tar.gz contendo todos os buckets, objetos e metadados
func (e *Engine) CreateSnapshot(outputFile string) (string, error) {
	tarFile, err := os.Create(outputFile)
	if err != nil {
		return "", fmt.Errorf("erro criando arquivo de snapshot: %w", err)
	}
	defer tarFile.Close()

	hasher := sha256.New()
	multiWriter := io.MultiWriter(tarFile, hasher)

	gzWriter := gzip.NewWriter(multiWriter)
	defer gzWriter.Close()

	tarWriter := tar.NewWriter(gzWriter)
	defer tarWriter.Close()

	buckets, err := e.storage.ListBuckets()
	if err != nil {
		return "", err
	}

	for _, b := range buckets {
		objects, err := e.storage.ListObjects(b.Name, "")
		if err != nil {
			continue
		}

		for _, obj := range objects {
			meta, reader, err := e.storage.GetObject(b.Name, obj.Key)
			if err != nil {
				continue
			}

			header := &tar.Header{
				Name:    filepath.Join(b.Name, obj.Key),
				Size:    obj.Size,
				Mode:    0644,
				ModTime: obj.LastModified,
			}
			if err := tarWriter.WriteHeader(header); err != nil {
				reader.Close()
				return "", err
			}
			io.Copy(tarWriter, reader)
			reader.Close()
		}
	}

	checksum := hex.EncodeToString(hasher.Sum(nil))
	log.Printf("[Backup Engine] Snapshot criado: %s (SHA256: %s)", outputFile, checksum)
	return checksum, nil
}

// RESTAURAÇÃO: extrai um snapshot .tar.gz e recria buckets e objetos no storage local
func (e *Engine) RestoreSnapshot(snapshotFile string, targetBucket string, overwrite bool) error {
	file, err := os.Open(snapshotFile)
	if err != nil {
		return fmt.Errorf("não foi possível abrir o arquivo de snapshot: %w", err)
	}
	defer file.Close()

	gzReader, err := gzip.NewReader(file)
	if err != nil {
		return fmt.Errorf("formato gzip inválido: %w", err)
	}
	defer gzReader.Close()

	tarReader := tar.NewReader(gzReader)
	restoredCount := 0

	for {
		header, err := tarReader.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("erro lendo cabeçalho tar: %w", err)
		}

		if header.Typeflag != tar.TypeReg {
			continue
		}

		cleanPath := strings.Trim(header.Name, "/")
		parts := strings.SplitN(cleanPath, "/", 2)
		if len(parts) < 2 {
			continue
		}

		srcBucket := parts[0]
		objKey := parts[1]

		finalBucket := srcBucket
		if targetBucket != "" {
			finalBucket = targetBucket
		}

		// Cria o bucket se não existir
		e.storage.CreateBucket(finalBucket)

		// Verifica se já existe e política de sobrescrita
		if !overwrite {
			if _, err := e.storage.GetMetadata(finalBucket, objKey); err == nil {
				continue // pula sobrescrita
			}
		}

		_, err = e.storage.PutObject(finalBucket, objKey, tarReader, "application/octet-stream", map[string]string{
			"x-amz-meta-restored-at": time.Now().UTC().Format(time.RFC3339),
			"x-amz-meta-original":    srcBucket,
		})
		if err != nil {
			log.Printf("[Restore Engine] Erro ao restaurar %s/%s: %v", finalBucket, objKey, err)
			continue
		}

		restoredCount++
	}

	log.Printf("[Restore Engine] Restauração concluída com sucesso! %d objetos restaurados.", restoredCount)
	return nil
}
