import { useState, useEffect } from 'react'
import { useAuth } from '../components/Auth'

// Calculate localStorage size
const getStorageSize = () => {
  let total = 0
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length + key.length
    }
  }
  return total
}

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const DATA_STORES = [
  { key: 'users', name: 'User Accounts', canDelete: false, kmValue: 'High', description: 'User profiles and authentication' },
  { key: 'suggestions', name: 'Employee Suggestions', canDelete: true, kmValue: 'Medium', description: 'Innovation ideas and feedback' },
  { key: 'documents', name: 'Document Library', canDelete: true, kmValue: 'High', description: 'Uploaded documents and files' },
  { key: 'cs_knowledge', name: 'Customer Support KB', canDelete: true, kmValue: 'High', description: 'Support knowledge base articles' },
  { key: 'it_knowledge', name: 'IT Support KB', canDelete: true, kmValue: 'High', description: 'Technical support documentation' },
  { key: 'analytics_data', name: 'Analytics Data', canDelete: true, kmValue: 'Low', description: 'Historical analytics and metrics' },
  { key: 'chat_history', name: 'Chat Conversations', canDelete: true, kmValue: 'Low', description: 'Anonymous chat messages' },
  { key: 'events', name: 'Event History', canDelete: true, kmValue: 'Low', description: 'Past events and RSVPs' },
  { key: 'polls', name: 'Voting/Polls', canDelete: true, kmValue: 'Medium', description: 'Poll results and votes' },
  { key: 'meetings', name: 'Meeting Schedules', canDelete: true, kmValue: 'Low', description: 'Meeting history and attendance' },
  { key: 'workplan', name: 'Strategic Workplan', canDelete: false, kmValue: 'High', description: 'Goals, initiatives, objectives, actions' },
  { key: 'workplan_documents', name: 'Workplan Documents', canDelete: true, kmValue: 'High', description: 'Meeting minutes and strategic docs' },
  { key: 'workplan_notifications', name: 'Workplan Notifications', canDelete: true, kmValue: 'Low', description: 'System notifications' },
  { key: 'knowledge_docs', name: 'Knowledge Management', canDelete: true, kmValue: 'High', description: 'Company knowledge repository' },
  { key: 'external_tickets', name: 'Customer Support Tickets', canDelete: true, kmValue: 'Medium', description: 'Customer service history' },
  { key: 'external_agents', name: 'Support Agents', canDelete: false, kmValue: 'High', description: 'Agent profiles and workload' },
  { key: 'contracts', name: 'Contract Reviews', canDelete: true, kmValue: 'High', description: 'Legal contract analysis' },
  { key: 'contract_templates', name: 'Contract Templates', canDelete: false, kmValue: 'High', description: 'Standard contract templates' },
  { key: 'candidates', name: 'Recruitment Candidates', canDelete: true, kmValue: 'Medium', description: 'Job applicant data' },
  { key: 'job_postings', name: 'Job Postings', canDelete: true, kmValue: 'Low', description: 'Open positions' },
  { key: 'performance_assessments', name: 'Performance Reviews', canDelete: false, kmValue: 'High', description: 'Employee assessments' },
  { key: 'app_config', name: 'App Configuration', canDelete: false, kmValue: 'High', description: 'System settings' }
]

export default function DataManagement() {
  const { user } = useAuth()
  const [storageData, setStorageData] = useState([])
  const [totalSize, setTotalSize] = useState(0)
  const [selectedItems, setSelectedItems] = useState([])

  useEffect(() => {
    if (user?.role !== 'admin') {
      alert('Access denied. Admin only.')
      return
    }
    loadStorageData()
  }, [])

  const loadStorageData = () => {
    const data = DATA_STORES.map(store => {
      const value = localStorage.getItem(store.key)
      const size = value ? value.length + store.key.length : 0
      const itemCount = value ? (Array.isArray(JSON.parse(value)) ? JSON.parse(value).length : 1) : 0
      
      return {
        ...store,
        size,
        itemCount,
        exists: !!value
      }
    }).filter(d => d.exists)

    setStorageData(data)
    setTotalSize(getStorageSize())
  }

  const deleteData = (key) => {
    if (!confirm(`Delete all data for "${DATA_STORES.find(d => d.key === key)?.name}"? This cannot be undone.`)) return
    localStorage.removeItem(key)
    loadStorageData()
    alert('✓ Data deleted')
  }

  const bulkDelete = () => {
    if (selectedItems.length === 0) {
      alert('Please select items to delete')
      return
    }
    if (!confirm(`Delete ${selectedItems.length} data stores? This cannot be undone.`)) return
    
    selectedItems.forEach(key => localStorage.removeItem(key))
    setSelectedItems([])
    loadStorageData()
    alert(`✓ Deleted ${selectedItems.length} data stores`)
  }

  const exportData = (key) => {
    const data = localStorage.getItem(key)
    if (!data) return
    
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${key}_backup_${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }

  const exportAll = () => {
    const allData = {}
    DATA_STORES.forEach(store => {
      const value = localStorage.getItem(store.key)
      if (value) allData[store.key] = value
    })
    
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `complete_backup_${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }

  const maxStorage = 10 * 1024 * 1024 // 10MB typical localStorage limit
  const usagePercent = (totalSize / maxStorage * 100).toFixed(1)

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>💾 Data Management</h1>
      <p style={{ color: '#666' }}>Monitor storage usage and manage data retention</p>
      {user && <p style={{ fontSize: '0.9rem', color: '#666' }}>Admin: {user.name}</p>}

      {/* Storage Overview */}
      <div style={{ marginTop: '2rem', padding: '2rem', background: 'white', borderRadius: '8px', border: '2px solid #ddd' }}>
        <h2>Storage Overview</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ padding: '1.5rem', background: '#f0f4ff', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>{formatBytes(totalSize)}</div>
            <div style={{ color: '#666' }}>Total Used</div>
          </div>
          <div style={{ padding: '1.5rem', background: '#f0fff0', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>{formatBytes(maxStorage - totalSize)}</div>
            <div style={{ color: '#666' }}>Available</div>
          </div>
          <div style={{ padding: '1.5rem', background: usagePercent > 80 ? '#fff0f0' : '#f9f9f9', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: usagePercent > 80 ? '#ff6b6b' : '#666' }}>{usagePercent}%</div>
            <div style={{ color: '#666' }}>Usage</div>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }}>
          <strong>💡 Storage Recommendations:</strong>
          <ul style={{ marginTop: '0.5rem', marginBottom: 0 }}>
            <li>Typical deployment: 2-5 MB for 100 users</li>
            <li>Maximum localStorage: ~10 MB (browser limit)</li>
            <li>Archive old data regularly (quarterly recommended)</li>
            <li>High KM value data should be exported before deletion</li>
          </ul>
        </div>
      </div>

      {/* Bulk Actions */}
      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
        <button
          onClick={exportAll}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          📥 Export All Data
        </button>
        {selectedItems.length > 0 && (
          <button
            onClick={bulkDelete}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#ff6b6b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            🗑️ Delete Selected ({selectedItems.length})
          </button>
        )}
      </div>

      {/* Data Stores Table */}
      <div style={{ marginTop: '2rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                <input 
                  type="checkbox" 
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedItems(storageData.filter(d => d.canDelete).map(d => d.key))
                    } else {
                      setSelectedItems([])
                    }
                  }}
                />
              </th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Data Store</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Description</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Items</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Size</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>KM Value</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {storageData.map(store => (
              <tr key={store.key} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '1rem' }}>
                  {store.canDelete && (
                    <input 
                      type="checkbox"
                      checked={selectedItems.includes(store.key)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems([...selectedItems, store.key])
                        } else {
                          setSelectedItems(selectedItems.filter(k => k !== store.key))
                        }
                      }}
                    />
                  )}
                </td>
                <td style={{ padding: '1rem', fontWeight: 'bold' }}>{store.name}</td>
                <td style={{ padding: '1rem', color: '#666', fontSize: '0.9rem' }}>{store.description}</td>
                <td style={{ padding: '1rem' }}>{store.itemCount}</td>
                <td style={{ padding: '1rem' }}>{formatBytes(store.size)}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    background: store.kmValue === 'High' ? '#28a745' : store.kmValue === 'Medium' ? '#ffa500' : '#999',
                    color: 'white',
                    borderRadius: '12px',
                    fontSize: '0.85rem'
                  }}>
                    {store.kmValue}
                  </span>
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => exportData(store.key)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      Export
                    </button>
                    {store.canDelete && (
                      <button
                        onClick={() => deleteData(store.key)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#ff6b6b',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* KM Value Legend */}
      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f9f9f9', borderRadius: '8px' }}>
        <strong>Knowledge Management (KM) Value Guide:</strong>
        <ul style={{ marginTop: '0.5rem', marginBottom: 0 }}>
          <li><strong style={{ color: '#28a745' }}>High:</strong> Critical business data - Export before deletion (contracts, assessments, strategic plans)</li>
          <li><strong style={{ color: '#ffa500' }}>Medium:</strong> Useful historical data - Consider archiving (suggestions, tickets, candidates)</li>
          <li><strong style={{ color: '#999' }}>Low:</strong> Transient data - Safe to delete regularly (chat history, old events, notifications)</li>
        </ul>
      </div>
    </div>
  )
}
