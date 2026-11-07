package storage_test

import (
	"bytes"
	"io"
	"os"
	"path/filepath"
	"testing"

	"github.com/vortexs3/vortexs3/pkg/storage"
)

func TestFilesystemStorage(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "vortex-test-*")
	if err != nil {
		t.Fatalf("erro ao criar tempdir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	store, err := storage.NewFilesystemStorage(tempDir)
	if err != nil {
		t.Fatalf("falha ao inicializar storage: %v", err)
	}
	defer store.Close()

	// 1. Teste de Criação de Bucket
	bucketName := "production-test"
	if err := store.CreateBucket(bucketName); err != nil {
		t.Fatalf("falha ao criar bucket: %v", err)
	}

	exists, err := store.BucketExists(bucketName)
	if err != nil || !exists {
		t.Fatalf("bucket deveria existir: %v", err)
	}

	// 2. Teste de Escrita de Objeto (PUT)
	objKey := "documents/readme.txt"
	content := []byte("VortexS3 High Performance Object Storage Engine")
	meta, err := store.PutObject(bucketName, objKey, bytes.NewReader(content), int64(len(content)), "text/plain", nil)
	if err != nil {
		t.Fatalf("falha ao salvar objeto: %v", err)
	}

	if meta.Size != int64(len(content)) {
		t.Errorf("tamanho incorreto: esperado %d, obtido %d", len(content), meta.Size)
	}

	// 3. Teste de Leitura de Objeto (GET)
	reader, gotMeta, err := store.GetObject(bucketName, objKey)
	if err != nil {
		t.Fatalf("falha ao ler objeto: %v", err)
	}
	defer reader.Close()

	gotContent, err := io.ReadAll(reader)
	if err != nil {
		t.Fatalf("falha ao ler stream de bytes: %v", err)
	}

	if !bytes.Equal(gotContent, content) {
		t.Errorf("conteúdo corrompido: esperado %s, obtido %s", string(content), string(gotContent))
	}

	if gotMeta.ETag != meta.ETag {
		t.Errorf("ETag divergente: esperado %s, obtido %s", meta.ETag, gotMeta.ETag)
	}

	// 4. Teste de Deleção
	if err := store.DeleteObject(bucketName, objKey); err != nil {
		t.Fatalf("falha ao deletar objeto: %v", err)
	}

	_, _, err = store.GetObject(bucketName, objKey)
	if err == nil {
		t.Fatal("objeto deveria ter sido excluído")
	}
}
