package storage

import (
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sync"
	"time"
)

var (
	ErrNotFound      = errors.New("objeto ou bucket não encontrado")
	ErrAlreadyExists = errors.New("bucket já existente")
	ErrNotEmpty      = errors.New("bucket não vazio")
)

type ObjectMetadata struct {
	Key          string            `json:"key"`
	Bucket       string            `json:"bucket"`
	Size         int64             `json:"size"`
	ETag         string            `json:"etag"`
	ContentType  string            `json:"content_type"`
	LastModified time.Time         `json:"last_modified"`
	VersionID    string            `json:"version_id"`
	Metadata     map[string]string `json:"metadata"`
}

type BucketInfo struct {
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
}

type FilesystemStorage struct {
	baseDir string
	mu      sync.RWMutex
}

func NewFilesystemStorage(baseDir string) (*FilesystemStorage, error) {
	if err := os.MkdirAll(filepath.Join(baseDir, "buckets"), 0755); err != nil {
		return nil, fmt.Errorf("erro criando diretório de buckets: %w", err)
	}
	if err := os.MkdirAll(filepath.Join(baseDir, "meta"), 0755); err != nil {
		return nil, fmt.Errorf("erro criando diretório de metadados: %w", err)
	}
	return &FilesystemStorage{baseDir: baseDir}, nil
}

func (s *FilesystemStorage) Close() error {
	return nil
}

func (s *FilesystemStorage) CreateBucket(name string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	dir := filepath.Join(s.baseDir, "buckets", name)
	if _, err := os.Stat(dir); err == nil {
		return ErrAlreadyExists
	}
	return os.MkdirAll(dir, 0755)
}

func (s *FilesystemStorage) BucketExists(name string) (bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	dir := filepath.Join(s.baseDir, "buckets", name)
	info, err := os.Stat(dir)
	if err != nil {
		return false, nil
	}
	return info.IsDir(), nil
}

func (s *FilesystemStorage) ListBuckets() ([]BucketInfo, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	entries, err := os.ReadDir(filepath.Join(s.baseDir, "buckets"))
	if err != nil {
		return nil, err
	}

	var buckets []BucketInfo
	for _, entry := range entries {
		if entry.IsDir() {
			info, _ := entry.Info()
			buckets = append(buckets, BucketInfo{
				Name:      entry.Name(),
				CreatedAt: info.ModTime(),
			})
		}
	}
	return buckets, nil
}

func (s *FilesystemStorage) DeleteBucket(name string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	dir := filepath.Join(s.baseDir, "buckets", name)
	entries, err := os.ReadDir(dir)
	if err != nil {
		return ErrNotFound
	}
	if len(entries) > 0 {
		return ErrNotEmpty
	}
	return os.Remove(dir)
}

func (s *FilesystemStorage) PutObject(bucket, key string, reader io.Reader, contentType string, meta map[string]string) (*ObjectMetadata, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	targetPath := filepath.Join(s.baseDir, "buckets", bucket, key)
	if err := os.MkdirAll(filepath.Dir(targetPath), 0755); err != nil {
		return nil, err
	}

	tempPath := targetPath + ".tmp." + fmt.Sprintf("%d", time.Now().UnixNano())
	tmpFile, err := os.Create(tempPath)
	if err != nil {
		return nil, err
	}

	hasher := md5.New()
	multiWriter := io.MultiWriter(tmpFile, hasher)
	size, err := io.Copy(multiWriter, reader)
	tmpFile.Close()
	if err != nil {
		os.Remove(tempPath)
		return nil, err
	}

	if err := os.Rename(tempPath, targetPath); err != nil {
		return nil, err
	}

	etag := hex.EncodeToString(hasher.Sum(nil))
	objMeta := ObjectMetadata{
		Key:          key,
		Bucket:       bucket,
		Size:         size,
		ETag:         etag,
		ContentType:  contentType,
		LastModified: time.Now(),
		VersionID:    fmt.Sprintf("v-%d", time.Now().Unix()),
		Metadata:     meta,
	}

	metaPath := filepath.Join(s.baseDir, "meta", bucket, key+".json")
	os.MkdirAll(filepath.Dir(metaPath), 0755)
	metaBytes, _ := json.Marshal(objMeta)
	os.WriteFile(metaPath, metaBytes, 0644)

	return &objMeta, nil
}

func (s *FilesystemStorage) GetObject(bucket, key string) (*ObjectMetadata, io.ReadCloser, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	targetPath := filepath.Join(s.baseDir, "buckets", bucket, key)
	file, err := os.Open(targetPath)
	if err != nil {
		return nil, nil, ErrNotFound
	}

	meta, _ := s.GetMetadata(bucket, key)
	if meta == nil {
		info, _ := file.Stat()
		meta = &ObjectMetadata{
			Key:          key,
			Bucket:       bucket,
			Size:         info.Size(),
			ETag:         "computed",
			ContentType:  "application/octet-stream",
			LastModified: info.ModTime(),
		}
	}
	return meta, file, nil
}

func (s *FilesystemStorage) GetMetadata(bucket, key string) (*ObjectMetadata, error) {
	metaPath := filepath.Join(s.baseDir, "meta", bucket, key+".json")
	bytes, err := os.ReadFile(metaPath)
	if err != nil {
		return nil, ErrNotFound
	}
	var meta ObjectMetadata
	if err := json.Unmarshal(bytes, &meta); err != nil {
		return nil, err
	}
	return &meta, nil
}

func (s *FilesystemStorage) DeleteObject(bucket, key string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	targetPath := filepath.Join(s.baseDir, "buckets", bucket, key)
	metaPath := filepath.Join(s.baseDir, "meta", bucket, key+".json")

	os.Remove(metaPath)
	err := os.Remove(targetPath)
	if os.IsNotExist(err) {
		return ErrNotFound
	}
	return err
}

func (s *FilesystemStorage) ListObjects(bucket, prefix string) ([]ObjectMetadata, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	metaDir := filepath.Join(s.baseDir, "meta", bucket)
	var list []ObjectMetadata

	filepath.Walk(metaDir, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() || filepath.Ext(path) != ".json" {
			return nil
		}
		data, err := os.ReadFile(path)
		if err == nil {
			var meta ObjectMetadata
			if json.Unmarshal(data, &meta) == nil {
				if prefix == "" || filepath.HasPrefix(meta.Key, prefix) {
					list = append(list, meta)
				}
			}
		}
		return nil
	})

	return list, nil
}
