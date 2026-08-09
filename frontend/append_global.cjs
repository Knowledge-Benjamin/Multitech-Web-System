const fs = require('fs');
const path = './src/styles/global.css';
const appendCSS = `

/* ===== GLOBAL UI COMPONENTS (Consolidated) ===== */
.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.form-row {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}
@media (max-width: 640px) {
  .form-row { flex-direction: column; }
}

.form-actions {
  display: flex;
  gap: var(--spacing-md);
  margin-top: var(--spacing-lg);
}

.alert {
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  margin-bottom: var(--spacing-md);
  font-weight: var(--font-weight-medium);
}
.alert-error {
  background-color: #fee2e2;
  color: #991b1b;
  border: 1px solid #f87171;
}
.alert-success {
  background-color: #dcfce7;
  color: #166534;
  border: 1px solid #4ade80;
}

.badge, .status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  background-color: #f1f5f9;
  color: #475569;
}
.status-rejected { background-color: #fee2e2; color: #991b1b; }

.admin-layout {
  display: flex;
  min-height: 100vh;
  background-color: var(--color-bg-secondary);
}
.admin-sidebar {
  width: 250px;
  background-color: #1e293b;
  color: white;
  flex-shrink: 0;
}
.admin-content, .admin-container {
  flex: 1;
  padding: var(--spacing-xl);
  overflow-y: auto;
}
.content-header, .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
}
`;
fs.appendFileSync(path, appendCSS);
console.log('Appended global UI components to global.css');
