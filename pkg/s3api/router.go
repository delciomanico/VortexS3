package s3api

import (
	"encoding/xml"
	"net/http"
	"strings"
	"time"

	"github.com/vortexs3/vortexs3/pkg/backup"
	"github.com/vortexs3/vortexs3/pkg/replication"
	"github.com/vortexs3/vortexs3/pkg/storage"
)

type S3Router struct {
	storage     *storage.FilesystemStorage
	replication *replication.Manager
	backup      *backup.Engine
	accessKey   string
	secretKey   string
}

func NewRouter(st *storage.FilesystemStorage, rep *replication.Manager, bk *backup.Engine, ak, sk string) http.Handler {
	return &S3Router{
		storage:     st,
		replication: rep,
		backup:      bk,
		accessKey:   ak,
		secretKey:   sk,
	}
}

func (s *S3Router) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, HEAD, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, Content-MD5, x-amz-date, x-amz-content-sha256, x-amz-meta-*")
	w.Header().Set("Access-Control-Expose-Headers", "ETag, x-amz-request-id, x-amz-version-id")
	w.Header().Set("Server", "VortexS3/1.0.0")

	if req.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if req.URL.Path == "/metrics" {
		s.handlePrometheusMetrics(w, req)
		return
	}

	if req.URL.Path == "/healthz" || req.URL.Path == "/minio/health/live" {
		w.Header().Set("Content-Type", "text/plain")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
		return
	}

	if req.URL.Path == "/readyz" || req.URL.Path == "/minio/health/ready" {
		w.Header().Set("Content-Type", "text/plain")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("READY"))
		return
	}

	path := strings.Trim(req.URL.Path, "/")
	if path == "" {
		if req.Method == http.MethodGet {
			s.handleListBuckets(w, req)
			return
		}
		writeS3Error(w, http.StatusBadRequest, "InvalidRequest", "Requisição não suportada na raiz")
		return
	}

	parts := strings.SplitN(path, "/", 2)
	bucketName := parts[0]
	objectKey := ""
	if len(parts) > 1 {
		objectKey = parts[1]
	}

	if objectKey == "" {
		switch req.Method {
		case http.MethodPut:
			s.handleCreateBucket(w, req, bucketName)
		case http.MethodGet:
			s.handleListObjects(w, req, bucketName)
		case http.MethodDelete:
			s.handleDeleteBucket(w, req, bucketName)
		case http.MethodHead:
			s.handleHeadBucket(w, req, bucketName)
		default:
			writeS3Error(w, http.StatusMethodNotAllowed, "MethodNotAllowed", "Método não permitido para bucket")
		}
		return
	}

	switch req.Method {
	case http.MethodPut:
		s.handlePutObject(w, req, bucketName, objectKey)
	case http.MethodGet:
		s.handleGetObject(w, req, bucketName, objectKey)
	case http.MethodHead:
		s.handleHeadObject(w, req, bucketName, objectKey)
	case http.MethodDelete:
		s.handleDeleteObject(w, req, bucketName, objectKey)
	default:
		writeS3Error(w, http.StatusMethodNotAllowed, "MethodNotAllowed", "Método não suportado para objeto")
	}
}

type ErrorResponse struct {
	XMLName   xml.Name `xml:"Error"`
	Code      string   `xml:"Code"`
	Message   string   `xml:"Message"`
	Resource  string   `xml:"Resource,omitempty"`
	RequestId string   `xml:"RequestId"`
}

func writeS3Error(w http.ResponseWriter, statusCode int, code, message string) {
	w.Header().Set("Content-Type", "application/xml")
	w.WriteHeader(statusCode)
	resp := ErrorResponse{
		Code:      code,
		Message:   message,
		RequestId: time.Now().Format("20060102150405"),
	}
	xml.NewEncoder(w).Encode(resp)
}
