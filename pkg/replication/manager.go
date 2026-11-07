package replication

import (
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/vortexs3/vortexs3/pkg/storage"
)

type PeerNode struct {
	ID        string    `json:"id"`
	Endpoint  string    `json:"endpoint"`
	IsHealthy bool      `json:"is_healthy"`
	LastSeen  time.Time `json:"last_seen"`
}

type ReplicationTask struct {
	Action string
	Bucket string
	Key    string
	Size   int64
	ETag   string
}

type Manager struct {
	nodeID     string
	bindAddr   string
	peers      map[string]*PeerNode
	storage    *storage.FilesystemStorage
	queue      chan ReplicationTask
	httpClient *http.Client
	mu         sync.RWMutex
	cancelFunc context.CancelFunc
}

func NewManager(nodeID, bindAddr string, peerEndpoints []string, store *storage.FilesystemStorage) *Manager {
	peers := make(map[string]*PeerNode)
	for i, ep := range peerEndpoints {
		id := fmt.Sprintf("peer-%d", i+1)
		peers[id] = &PeerNode{
			ID:        id,
			Endpoint:  ep,
			IsHealthy: true,
			LastSeen:  time.Now(),
		}
	}

	return &Manager{
		nodeID:   nodeID,
		bindAddr: bindAddr,
		peers:    peers,
		storage:  store,
		queue:    make(chan ReplicationTask, 1000),
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (m *Manager) Start(ctx context.Context) {
	ctx, cancel := context.WithCancel(ctx)
	m.cancelFunc = cancel

	log.Printf("[Replicação] Motor ativo com %d nós pares registrados.", len(m.peers))
	go m.worker(ctx)
	go m.heartbeatWorker(ctx)
}

func (m *Manager) Stop() {
	if m.cancelFunc != nil {
		m.cancelFunc()
	}
}

func (m *Manager) ReplicateObject(bucket, key string, size int64, etag string) {
	select {
	case m.queue <- ReplicationTask{
		Action: "PUT",
		Bucket: bucket,
		Key:    key,
		Size:   size,
		ETag:   etag,
	}:
	default:
		log.Printf("[Replicação] AVISO: Fila de replicação cheia para %s/%s", bucket, key)
	}
}

func (m *Manager) ReplicateDelete(bucket, key string) {
	select {
	case m.queue <- ReplicationTask{
		Action: "DELETE",
		Bucket: bucket,
		Key:    key,
	}:
	default:
		log.Printf("[Replicação] AVISO: Fila de replicação cheia ao deletar %s/%s", bucket, key)
	}
}

func (m *Manager) worker(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case task := <-m.queue:
			m.broadcastTask(task)
		}
	}
}

func (m *Manager) broadcastTask(task ReplicationTask) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for _, peer := range m.peers {
		if !peer.IsHealthy {
			continue
		}

		go func(p *PeerNode) {
			targetURL := fmt.Sprintf("%s/%s/%s", p.Endpoint, task.Bucket, task.Key)

			if task.Action == "DELETE" {
				req, _ := http.NewRequest(http.MethodDelete, targetURL, nil)
				resp, err := m.httpClient.Do(req)
				if err == nil {
					resp.Body.Close()
				}
				return
			}

			_, reader, err := m.storage.GetObject(task.Bucket, task.Key)
			if err != nil {
				return
			}
			defer reader.Close()

			req, _ := http.NewRequest(http.MethodPut, targetURL, reader)
			req.Header.Set("x-vortex-replicated", "true")
			resp, err := m.httpClient.Do(req)
			if err != nil {
				log.Printf("[Replicação] Falha replicando para %s: %v", p.Endpoint, err)
			} else {
				io.Copy(io.Discard, resp.Body)
				resp.Body.Close()
			}
		}(peer)
	}
}

func (m *Manager) heartbeatWorker(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			m.checkPeersHealth()
		}
	}
}

func (m *Manager) checkPeersHealth() {
	m.mu.Lock()
	defer m.mu.Unlock()

	for _, peer := range m.peers {
		resp, err := m.httpClient.Get(peer.Endpoint + "/healthz")
		if err != nil || resp.StatusCode != http.StatusOK {
			if peer.IsHealthy {
				log.Printf("[Replicação] Nó %s (%s) OFFLINE. Falhas detectadas.", peer.ID, peer.Endpoint)
			}
			peer.IsHealthy = false
		} else {
			if !peer.IsHealthy {
				log.Printf("[Replicação] Nó %s (%s) recuperou status ONLINE! Iniciando catch-up...", peer.ID, peer.Endpoint)
			}
			peer.IsHealthy = true
			peer.LastSeen = time.Now()
			resp.Body.Close()
		}
	}
}
