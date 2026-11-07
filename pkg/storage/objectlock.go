package storage

import (
	"errors"
	"time"
)

var (
	ErrObjectLocked = errors.New("ObjectLock: objeto protegido contra exclusão ou sobrescrita até a data de retenção")
	ErrLegalHold    = errors.New("ObjectLock: objeto sob bloqueio jurídico (Legal Hold ativo)")
)

type RetentionMode string

const (
	GovernanceMode RetentionMode = "GOVERNANCE"
	ComplianceMode RetentionMode = "COMPLIANCE"
)

type ObjectLockConfig struct {
	Enabled          bool          `json:"enabled"`
	DefaultMode      RetentionMode `json:"default_mode"`
	DefaultDays      int           `json:"default_days"`
}

type ObjectLockInfo struct {
	Mode             RetentionMode `json:"mode,omitempty"`
	RetainUntilDate  time.Time     `json:"retain_until_date,omitempty"`
	LegalHold        bool          `json:"legal_hold,omitempty"`
}

// ValidateCanDelete verifica se o objeto tem permissão para exclusão segundo as regras WORM
func (info *ObjectLockInfo) ValidateCanDelete() error {
	if info.LegalHold {
		return ErrLegalHold
	}
	if !info.RetainUntilDate.IsZero() && time.Now().Before(info.RetainUntilDate) {
		return ErrObjectLocked
	}
	return nil
}
