import { BADGES, BADGE_BY_ID } from '../../badges/definitions.js';
import { Modal } from '../../components/Modal.jsx';
import { STRINGS } from '../../i18n.js';

export function BadgeModal({ open, onClose, earned = [], newlyEarned = [] }) {
  const earnedSet = new Set(earned);
  const newSet = new Set(newlyEarned);
  return (
    <Modal open={open} onClose={onClose} title={STRINGS.kid.badges.title}>
      <div class="badge-grid">
        {BADGES.map((b) => {
          const isEarned = earnedSet.has(b.id);
          const isNew = newSet.has(b.id);
          return (
            <div
              key={b.id}
              class={`badge-item ${isEarned ? '' : 'badge-item--locked'} ${isNew ? 'badge-item--new' : ''}`}
              title={isEarned ? b.hint : '???'}
            >
              <div class="badge-item__emoji">{isEarned ? b.emoji : '🔒'}</div>
              <div class="badge-item__name">{isEarned ? b.name : STRINGS.kid.badges.locked}</div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
