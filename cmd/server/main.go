package main

import (
	"context"
	"flag"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/vortexs3/vortexs3/pkg/backup"
	"github.com/vortexs3/vortexs3/pkg/replication"
	"github.com/vortexs3/vortexs3/pkg/s3api"
	"github.com/vortexs3/vortexs3/pkg/storage"
)

var (
	Version   = "v1.0.0"
	BuildTime = "2026-10-29"
)

func main() {
	var (
		dataDir     = flag.String("data", "/data", "Caminho do diretório de armazenamento de dados")
		s3Addr      = flag.String("address", ":9000", "Endereço de bind da API S3")
		consoleAddr = flag.String("console-address", ":9001", "Endereço de bind do Console Web Administrativo")
		peersFlag   = flag.String("peers", "", "Lista de nós pares (ex: http://node2:9000,http://node3:9000)")
		nodeID      = flag.String("node-id", "node-1", "Identificador único deste nó no cluster")
		accessKey   = flag.String("access-key", "VXAKIA799PRODROOT", "Root Access Key ID")
		secretKey   = flag.String("secret-key", "vxs_wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY", "Root Secret Access Key")
		restoreFile = flag.String("restore", "", "Caminho para arquivo .tar.gz de snapshot para restaurar na inicialização")
	)
	flag.Parse()

	if envData := os.Getenv("VORTEX_DATA_DIR"); envData != "" {
		*dataDir = envData
	}
	if envPeers := os.Getenv("VORTEX_PEERS"); envPeers != "" {
		*peersFlag = envPeers
	}
	if envNode := os.Getenv("VORTEX_NODE_ID"); envNode != "" {
		*nodeID = envNode
	}
	if envKey := os.Getenv("VORTEX_ROOT_ACCESS_KEY"); envKey != "" {
		*accessKey = envKey
	}
	if envSec := os.Getenv("VORTEX_ROOT_SECRET_KEY"); envSec != "" {
		*secretKey = envSec
	}
	if envRestore := os.Getenv("VORTEX_RESTORE_FILE"); envRestore != "" {
		*restoreFile = envRestore
	}

	log.Printf("[VortexS3 %s] Iniciando servidor de Object Storage compatível com AWS S3...", Version)
	log.Printf("[VortexS3] Diretório de dados: %s", *dataDir)
	log.Printf("[VortexS3] Nó ID: %s", *nodeID)

	store, err := storage.NewFilesystemStorage(*dataDir)
	if err != nil {
		log.Fatalf("Falha crítica ao inicializar storage: %v", err)
	}
	defer store.Close()

	backupEngine := backup.NewEngine(store, *dataDir+"/backups")
	backupEngine.StartScheduler()
	defer backupEngine.StopScheduler()

	// 1. Executa restauração inicial se solicitado via flag ou variável de ambiente
	if *restoreFile != "" {
		log.Printf("[VortexS3 - Restore] Executando restauração do snapshot: %s", *restoreFile)
		if err := backupEngine.RestoreSnapshot(*restoreFile, "", true); err != nil {
			log.Printf("[VortexS3 - Restore] AVISO: Falha durante restauração: %v", err)
		} else {
			log.Println("[VortexS3 - Restore] Snapshot restaurado com sucesso no filesystem local!")
		}
	}

	// 2. Inicializa o motor de replicação
	var peerList []string
	if *peersFlag != "" {
		peerList = strings.Split(*peersFlag, ",")
	}
	replEngine := replication.NewManager(*nodeID, *s3Addr, peerList, store)
	replEngine.Start(context.Background())
	defer replEngine.Stop()

	// 3. Inicializa o motor de ciclo de vida (Lifecycle)
	lifecycleEngine := storage.NewLifecycleWorker(store, 6*time.Hour)
	lifecycleEngine.Start(context.Background())
	defer lifecycleEngine.Stop()

	s3Router := s3api.NewRouter(store, replEngine, backupEngine, *accessKey, *secretKey)

	serverS3 := &http.Server{
		Addr:         *s3Addr,
		Handler:      s3Router,
		ReadTimeout:  120 * time.Second,
		WriteTimeout: 120 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		log.Printf("[VortexS3] API S3 escutando em http://0.0.0.0%s", *s3Addr)
		if err := serverS3.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Erro no servidor S3: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("[VortexS3] Encerrando nós e finalizando conexões ativas...")
	ctxShutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := serverS3.Shutdown(ctxShutdown); err != nil {
		log.Printf("Erro durante shutdown: %v", err)
	}
	log.Println("[VortexS3] Servidor encerrado com sucesso.")
}
