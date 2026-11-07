package s3api

import (
	"crypto/md5"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/vortexs3/vortexs3/pkg/storage"
)

func (s *S3Router) handlePutObject(w http.ResponseWriter, req *http.Request, bucket, key string) {
	contentType := req.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	customMeta := make(map[string]string)
	for k, v := range req.Header {
		lowerK := strings.ToLower(k)
		if strings.HasPrefix(lowerK, "x-amz-meta-") && len(v) > 0 {
			customMeta[lowerK] = v[0]
		}
	}

	obj, err := s.storage.PutObject(bucket, key, req.Body, contentType, customMeta)
	if err != nil {
		writeS3Error(w, http.StatusInternalServerError, "InternalError", fmt.Sprintf("Erro ao gravar objeto: %v", err))
		return
	}

	go s.replication.ReplicateObject(bucket, key, obj.Size, obj.ETag)

	w.Header().Set("ETag", fmt.Sprintf(""%s"", obj.ETag))
	w.Header().Set("x-amz-version-id", obj.VersionID)
	w.WriteHeader(http.StatusOK)
}

func (s *S3Router) handleGetObject(w http.ResponseWriter, req *http.Request, bucket, key string) {
	obj, reader, err := s.storage.GetObject(bucket, key)
	if err != nil {
		if err == storage.ErrNotFound {
			writeS3Error(w, http.StatusNotFound, "NoSuchKey", "A chave informada não existe no bucket.")
			return
		}
		writeS3Error(w, http.StatusInternalServerError, "InternalError", err.Error())
		return
	}
	defer reader.Close()

	w.Header().Set("Content-Type", obj.ContentType)
	w.Header().Set("Content-Length", strconv.FormatInt(obj.Size, 10))
	w.Header().Set("ETag", fmt.Sprintf(""%s"", obj.ETag))
	w.Header().Set("Last-Modified", obj.LastModified.UTC().Format(http.TimeFormat))

	for k, v := range obj.Metadata {
		w.Header().Set(k, v)
	}

	w.WriteHeader(http.StatusOK)
	io.Copy(w, reader)
}

func (s *S3Router) handleHeadObject(w http.ResponseWriter, req *http.Request, bucket, key string) {
	obj, err := s.storage.GetMetadata(bucket, key)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", obj.ContentType)
	w.Header().Set("Content-Length", strconv.FormatInt(obj.Size, 10))
	w.Header().Set("ETag", fmt.Sprintf(""%s"", obj.ETag))
	w.Header().Set("Last-Modified", obj.LastModified.UTC().Format(http.TimeFormat))
	w.WriteHeader(http.StatusOK)
}

func (s *S3Router) handleDeleteObject(w http.ResponseWriter, req *http.Request, bucket, key string) {
	err := s.storage.DeleteObject(bucket, key)
	if err != nil && err != storage.ErrNotFound {
		writeS3Error(w, http.StatusInternalServerError, "InternalError", err.Error())
		return
	}

	go s.replication.ReplicateDelete(bucket, key)
	w.WriteHeader(http.StatusNoContent)
}

func computeMD5(r io.Reader) (string, error) {
	hasher := md5.New()
	if _, err := io.Copy(hasher, r); err != nil {
		return "", err
	}
	return hex.EncodeToString(hasher.Sum(nil)), nil
}
