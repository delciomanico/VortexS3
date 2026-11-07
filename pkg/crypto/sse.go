package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"errors"
	"io"
)

var (
	ErrDecryptionFailed = errors.New("sse: falha ao decifrar objeto - chave inválida ou dados corrompidos")
)

type SSEEngine struct {
	masterKey []byte
}

func NewSSEEngine(masterKey []byte) *SSEEngine {
	if len(masterKey) != 32 {
		// Garante chave de 256 bits
		key := make([]byte, 32)
		copy(key, masterKey)
		masterKey = key
	}
	return &SSEEngine{masterKey: masterKey}
}

// Encrypt payload transparente com AES-256-GCM e nonce criptográfico
func (e *SSEEngine) Encrypt(plaintext []byte) ([]byte, error) {
	block, err := aes.NewCipher(e.masterKey)
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, err
	}

	// Anexa o nonce no início do ciphertext
	ciphertext := gcm.Seal(nonce, nonce, plaintext, nil)
	return ciphertext, nil
}

// Decrypt extrai o nonce e valida a tag de autenticação GCM
func (e *SSEEngine) Decrypt(ciphertext []byte) ([]byte, error) {
	block, err := aes.NewCipher(e.masterKey)
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return nil, ErrDecryptionFailed
	}

	nonce, encryptedData := ciphertext[:nonceSize], ciphertext[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, encryptedData, nil)
	if err != nil {
		return nil, ErrDecryptionFailed
	}

	return plaintext, nil
}
