package s3api

import (
	"encoding/xml"
	"net/http"
	"time"

	"github.com/vortexs3/vortexs3/pkg/storage"
)

type ListAllMyBucketsResult struct {
	XMLName xml.Name     `xml:"ListAllMyBucketsResult"`
	Buckets BucketListXML `xml:"Buckets"`
}

type BucketListXML struct {
	Bucket []BucketItemXML `xml:"Bucket"`
}

type BucketItemXML struct {
	Name         string `xml:"Name"`
	CreationDate string `xml:"CreationDate"`
}

func (s *S3Router) handleListBuckets(w http.ResponseWriter, req *http.Request) {
	buckets, err := s.storage.ListBuckets()
	if err != nil {
		writeS3Error(w, http.StatusInternalServerError, "InternalError", err.Error())
		return
	}

	var items []BucketItemXML
	for _, b := range buckets {
		items = append(items, BucketItemXML{
			Name:         b.Name,
			CreationDate: b.CreatedAt.UTC().Format(time.RFC3339),
		})
	}

	resp := ListAllMyBucketsResult{
		Buckets: BucketListXML{Bucket: items},
	}

	w.Header().Set("Content-Type", "application/xml")
	w.WriteHeader(http.StatusOK)
	xml.NewEncoder(w).Encode(resp)
}

func (s *S3Router) handleCreateBucket(w http.ResponseWriter, req *http.Request, bucket string) {
	err := s.storage.CreateBucket(bucket)
	if err != nil {
		writeS3Error(w, http.StatusBadRequest, "BucketAlreadyExists", err.Error())
		return
	}
	w.Header().Set("Location", "/"+bucket)
	w.WriteHeader(http.StatusOK)
}

func (s *S3Router) handleDeleteBucket(w http.ResponseWriter, req *http.Request, bucket string) {
	err := s.storage.DeleteBucket(bucket)
	if err != nil {
		writeS3Error(w, http.StatusConflict, "BucketNotEmpty", "O bucket deve estar vazio para ser excluído.")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *S3Router) handleHeadBucket(w http.ResponseWriter, req *http.Request, bucket string) {
	exists, err := s.storage.BucketExists(bucket)
	if err != nil || !exists {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusOK)
}

type ListBucketResult struct {
	XMLName     xml.Name        `xml:"ListBucketResult"`
	Name        string          `xml:"Name"`
	Prefix      string          `xml:"Prefix"`
	KeyCount    int             `xml:"KeyCount"`
	MaxKeys     int             `xml:"MaxKeys"`
	Contents    []ObjectItemXML `xml:"Contents"`
}

type ObjectItemXML struct {
	Key          string `xml:"Key"`
	LastModified string `xml:"LastModified"`
	ETag         string `xml:"ETag"`
	Size         int64  `xml:"Size"`
	StorageClass string `xml:"StorageClass"`
}

func (s *S3Router) handleListObjects(w http.ResponseWriter, req *http.Request, bucket string) {
	prefix := req.URL.Query().Get("prefix")
	objects, err := s.storage.ListObjects(bucket, prefix)
	if err != nil {
		writeS3Error(w, http.StatusInternalServerError, "InternalError", err.Error())
		return
	}

	var contents []ObjectItemXML
	for _, obj := range objects {
		contents = append(contents, ObjectItemXML{
			Key:          obj.Key,
			LastModified: obj.LastModified.UTC().Format(time.RFC3339),
			ETag:         """ + obj.ETag + """,
			Size:         obj.Size,
			StorageClass: "STANDARD",
		})
	}

	result := ListBucketResult{
		Name:     bucket,
		Prefix:   prefix,
		KeyCount: len(contents),
		MaxKeys:  1000,
		Contents: contents,
	}

	w.Header().Set("Content-Type", "application/xml")
	w.WriteHeader(http.StatusOK)
	xml.NewEncoder(w).Encode(result)
}
