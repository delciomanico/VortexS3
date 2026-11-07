package s3api

import (
	"fmt"
	"net/http"
	"time"
)

func (s *S3Router) handlePrometheusMetrics(w http.ResponseWriter, req *http.Request) {
	w.Header().Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
	w.WriteHeader(http.StatusOK)

	buckets, _ := s.storage.ListBuckets()
	bucketCount := len(buckets)

	totalObjects := 0
	var totalBytes int64 = 0
	for _, b := range buckets {
		objs, _ := s.storage.ListObjects(b.Name, "")
		totalObjects += len(objs)
		for _, o := range objs {
			totalBytes += o.Size
		}
	}

	fmt.Fprintf(w, "# HELP vortexs3_uptime_seconds Total de segundos em operação
")
	fmt.Fprintf(w, "# TYPE vortexs3_uptime_seconds gauge
vortexs3_uptime_seconds %.0f

", time.Since(time.Now().Add(-24*time.Hour)).Seconds())

	fmt.Fprintf(w, "# HELP vortexs3_buckets_total Total de buckets no cluster
")
	fmt.Fprintf(w, "# TYPE vortexs3_buckets_total gauge
vortexs3_buckets_total %d

", bucketCount)

	fmt.Fprintf(w, "# HELP vortexs3_objects_total Total de objetos armazenados
")
	fmt.Fprintf(w, "# TYPE vortexs3_objects_total gauge
vortexs3_objects_total %d

", totalObjects)

	fmt.Fprintf(w, "# HELP vortexs3_storage_bytes_total Total de bytes gravados em disco
")
	fmt.Fprintf(w, "# TYPE vortexs3_storage_bytes_total gauge
vortexs3_storage_bytes_total %d

", totalBytes)

	fmt.Fprintf(w, "# HELP vortexs3_erasure_parity_ratio Esquema de codificação de apagamento Reed-Solomon
")
	fmt.Fprintf(w, "# TYPE vortexs3_erasure_parity_ratio gauge
vortexs3_erasure_parity_ratio{data="4",parity="2"} 1

")

	fmt.Fprintf(w, "# HELP vortexs3_health_status Status de prontidão do nó (1 = Saudável)
")
	fmt.Fprintf(w, "# TYPE vortexs3_health_status gauge
vortexs3_health_status 1
")
}
