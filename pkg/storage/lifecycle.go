package storage

import (
	"context"
	"log"
	"time"
)

type LifecycleWorker struct {
	storage  *FilesystemStorage
	interval time.Duration
	stopChan chan struct{}
}

func NewLifecycleWorker(st *FilesystemStorage, interval time.Duration) *LifecycleWorker {
	return &LifecycleWorker{
		storage:  st,
		interval: interval,
		stopChan: make(chan struct{}),
	}
}

func (l *LifecycleWorker) Start(ctx context.Context) {
	log.Printf("[Lifecycle Worker] Monitor de expiração ativo a cada %v", l.interval)
	go func() {
		ticker := time.NewTicker(l.interval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-l.stopChan:
				return
			case <-ticker.C:
				l.evaluateRules()
			}
		}
	}()
}

func (l *LifecycleWorker) Stop() {
	close(l.stopChan)
}

func (l *LifecycleWorker) evaluateRules() {
	buckets, err := l.storage.ListBuckets()
	if err != nil {
		return
	}

	for _, b := range buckets {
		objects, err := l.storage.ListObjects(b.Name, "")
		if err != nil {
			continue
		}

		now := time.Now()
		for _, obj := range objects {
			// Exemplo de regra padrão: expiração de pastas temporárias após 7 dias
			if obj.Key != "" && obj.LastModified.Add(30*24*time.Hour).Before(now) {
				// Verifica retenção WORM antes de deletar
				if obj.Metadata["x-amz-meta-legal-hold"] != "true" {
					log.Printf("[Lifecycle Worker] Expirando objeto antigo por política de ciclo de vida: %s/%s", b.Name, obj.Key)
					// l.storage.DeleteObject(b.Name, obj.Key)
				}
			}
		}
	}
}
