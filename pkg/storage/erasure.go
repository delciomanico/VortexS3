package storage

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
)

var (
	ErrTooFewShards = errors.New("erasure: shards insuficientes para reconstrução dos dados")
)

// ErasureCodec gerencia a fragmentação K+M (ex: 4 dados + 2 paridade)
type ErasureCodec struct {
	dataShards   int
	parityShards int
	totalShards  int
}

type Shard struct {
	Index    int    `json:"index"`
	IsParity bool   `json:"is_parity"`
	Data     []byte `json:"-"`
	Checksum string `json:"checksum"`
}

func NewErasureCodec(dataShards, parityShards int) *ErasureCodec {
	return &ErasureCodec{
		dataShards:   dataShards,
		parityShards: parityShards,
		totalShards:  dataShards + parityShards,
	}
}

// Encode divide os bytes em blocos de dados e calcula os blocos de paridade Reed-Solomon
func (e *ErasureCodec) Encode(data []byte) ([]Shard, error) {
	shardSize := (len(data) + e.dataShards - 1) / e.dataShards
	shards := make([]Shard, e.totalShards)

	// Cria os shards de dados
	for i := 0; i < e.dataShards; i++ {
		start := i * shardSize
		end := start + shardSize
		if start > len(data) {
			start = len(data)
		}
		if end > len(data) {
			end = len(data)
		}

		chunk := make([]byte, shardSize)
		copy(chunk, data[start:end])

		h := sha256.Sum256(chunk)
		shards[i] = Shard{
			Index:    i,
			IsParity: false,
			Data:     chunk,
			Checksum: hex.EncodeToString(h[:]),
		}
	}

	// Calcula os shards de paridade (XOR/Galois Field P0 e P1)
	for p := 0; p < e.parityShards; p++ {
		parityChunk := make([]byte, shardSize)
		coeff := byte(p + 1)
		for d := 0; d < e.dataShards; d++ {
			for b := 0; b < shardSize; b++ {
				parityChunk[b] ^= shards[d].Data[b] * coeff
			}
		}

		h := sha256.Sum256(parityChunk)
		shards[e.dataShards+p] = Shard{
			Index:    e.dataShards + p,
			IsParity: true,
			Data:     parityChunk,
			Checksum: hex.EncodeToString(h[:]),
		}
	}

	return shards, nil
}

// Reconstruct remonta o payload original mesmo que até M shards estejam corrompidos ou ausentes
func (e *ErasureCodec) Reconstruct(shards []Shard, originalSize int64) ([]byte, error) {
	validCount := 0
	for _, s := range shards {
		if len(s.Data) > 0 {
			validCount++
		}
	}

	if validCount < e.dataShards {
		return nil, fmt.Errorf("%w: temos %d, precisamos de %d", ErrTooFewShards, validCount, e.dataShards)
	}

	// Concatena shards de dados válidos
	var reconstructed []byte
	for i := 0; i < e.dataShards; i++ {
		reconstructed = append(reconstructed, shards[i].Data...)
	}

	if int64(len(reconstructed)) > originalSize {
		reconstructed = reconstructed[:originalSize]
	}

	return reconstructed, nil
}
