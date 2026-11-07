package s3api

import (
	"encoding/xml"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/vortexs3/vortexs3/pkg/storage"
)

type InitiateMultipartUploadResult struct {
	XMLName  xml.Name `xml:"InitiateMultipartUploadResult"`
	Bucket   string   `xml:"Bucket"`
	Key      string   `xml:"Key"`
	UploadId string   `xml:"UploadId"`
}

type CompleteMultipartUploadResult struct {
	XMLName  xml.Name `xml:"CompleteMultipartUploadResult"`
	Location string   `xml:"Location"`
	Bucket   string   `xml:"Bucket"`
	Key      string   `xml:"Key"`
	ETag     string   `xml:"ETag"`
}

func (s *S3Router) handleInitiateMultipartUpload(w http.ResponseWriter, req *http.Request, bucket, key string) {
	uploadID := fmt.Sprintf("upload-%d", time.Now().UnixNano())

	resp := InitiateMultipartUploadResult{
		Bucket:   bucket,
		Key:      key,
		UploadId: uploadID,
	}

	w.Header().Set("Content-Type", "application/xml")
	w.WriteHeader(http.StatusOK)
	xml.NewEncoder(w).Encode(resp)
}

func (s *S3Router) handleUploadPart(w http.ResponseWriter, req *http.Request, bucket, key, uploadID string, partNum int) {
	partKey := fmt.Sprintf(".parts/%s/%s/part_%04d", uploadID, key, partNum)
	obj, err := s.storage.PutObject(bucket, partKey, req.Body, "application/octet-stream", map[string]string{
		"x-amz-part-number": strconv.Itoa(partNum),
		"x-amz-upload-id":   uploadID,
	})
	if err != nil {
		writeS3Error(w, http.StatusInternalServerError, "InternalError", err.Error())
		return
	}

	w.Header().Set("ETag", fmt.Sprintf(""%s"", obj.ETag))
	w.WriteHeader(http.StatusOK)
}
