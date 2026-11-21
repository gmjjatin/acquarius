import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type TicketStatus = 'open' | 'in_progress' | 'closed'
type TicketPriority = 'low' | 'medium' | 'high'
type Ticket = {
  id: string
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  createdAt: string
  updatedAt: string
}
type PagedResult = { items: Ticket[]; page: number; pageSize: number; total: number }
type TicketSummary = { byStatus: Record<string, number>; byPriority: Record<string, number> }

function App() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [summary, setSummary] = useState<TicketSummary | null>(null)
  const [status, setStatus] = useState<TicketStatus | ''>('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TicketPriority>('medium')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ pageSize: '50' })
      if (status) params.set('status', status)
      if (search) params.set('search', search)
      const [listResponse, summaryResponse] = await Promise.all([
        fetch(`/api/tickets?${params}`),
        fetch('/api/tickets/summary')
      ])
      if (!listResponse.ok || !summaryResponse.ok) throw new Error('Unable to load tickets')
      const list = await listResponse.json() as PagedResult
      setTickets(list.items)
      setSummary(await summaryResponse.json() as TicketSummary)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load tickets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [status])

  const createTicket = async (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return setError('Title is required')
    if (title.length > 120) return setError('Title must be 120 characters or fewer')
    setError('')
    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), status: 'open', priority })
      })
      if (!response.ok) throw new Error('Unable to create ticket')
      setTitle('')
      setDescription('')
      setPriority('medium')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create ticket')
    }
  }

  const changeStatus = async (ticket: Ticket, nextStatus: TicketStatus) => {
    await fetch(`/api/tickets/${ticket.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: ticket.title, description: ticket.description, status: nextStatus, priority: ticket.priority })
    })
    await load()
  }

  const deleteTicket = async (id: string) => {
    if (!window.confirm('Delete this ticket?')) return
    await fetch(`/api/tickets/${id}`, { method: 'DELETE' })
    await load()
  }

  return (
    <main>
      <header><div><span className="eyebrow">ACQUARIUS SUPPORT</span><h1>Ticket Tracker</h1></div><span className="count">{tickets.length} tickets</span></header>
      {error && <div className="error" role="alert">{error}</div>}
      <section className="toolbar">
        <input aria-label="Search tickets" placeholder="Search by title..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && void load()} />
        <select aria-label="Filter by status" value={status} onChange={e => setStatus(e.target.value as TicketStatus | '')}>
          <option value="">All statuses</option><option value="open">Open</option><option value="in_progress">In progress</option><option value="closed">Closed</option>
        </select>
        <button className="secondary" onClick={() => void load()}>Search</button>
      </section>
      <div className="layout">
        <aside>
          <h2>New ticket</h2>
          <form onSubmit={createTicket}>
            <label>Title<input required maxLength={120} value={title} onChange={e => setTitle(e.target.value)} /></label>
            <label>Description<textarea value={description} onChange={e => setDescription(e.target.value)} /></label>
            <label>Priority<select value={priority} onChange={e => setPriority(e.target.value as TicketPriority)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
            <button type="submit">Create ticket</button>
          </form>
        </aside>
        <section className="content">
          {summary && <div className="summary">
            <div><span>Open</span><strong>{summary.byStatus.open ?? 0}</strong></div>
            <div><span>In progress</span><strong>{summary.byStatus.in_progress ?? 0}</strong></div>
            <div><span>Closed</span><strong>{summary.byStatus.closed ?? 0}</strong></div>
          </div>}
          {loading ? <div className="loading">Loading tickets...</div> : tickets.length === 0 ? <div className="empty">No tickets found</div> :
            <div className="table-wrap"><table><thead><tr><th>Ticket</th><th>Priority</th><th>Status</th><th></th></tr></thead><tbody>
              {tickets.map(ticket => <tr key={ticket.id}>
                <td><strong>{ticket.title}</strong><small>{ticket.description || 'No description'}</small></td>
                <td><span className={`badge ${ticket.priority}`}>{ticket.priority}</span></td>
                <td><select value={ticket.status} onChange={e => void changeStatus(ticket, e.target.value as TicketStatus)}><option value="open">Open</option><option value="in_progress">In progress</option><option value="closed">Closed</option></select></td>
                <td><button className="danger" onClick={() => void deleteTicket(ticket.id)}>Delete</button></td>
              </tr>)}
            </tbody></table></div>}
        </section>
      </div>
    </main>
  )
}

export default App
