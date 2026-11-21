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
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | ''>('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TicketPriority>('medium')
  const [expandedTitles, setExpandedTitles] = useState<Set<string>>(new Set())
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [totalTickets, setTotalTickets] = useState(0)

  // Load the current filter/search selection together with the matching summary counts.
  const load = async (requestedPage = page) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: requestedPage.toString(), pageSize: '5' })
      if (status) params.set('status', status)
      if (priorityFilter) params.set('priority', priorityFilter)
      if (search) params.set('search', search)
      const [listResponse, summaryResponse] = await Promise.all([
        fetch(`/api/tickets?${params}`),
        fetch('/api/tickets/summary')
      ])
      if (!listResponse.ok || !summaryResponse.ok) throw new Error('Unable to load tickets')
      const list = await listResponse.json() as PagedResult
      setTickets(list.items)
      setTotalTickets(list.total)
      setPage(list.page)
      // Filters or deletions can remove the final page; return to the last valid page.
      const maxPage = Math.max(1, Math.ceil(list.total / list.pageSize))
      if (list.page > maxPage) void load(maxPage)
      setSummary(await summaryResponse.json() as TicketSummary)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load tickets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [status, priorityFilter, page])

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

  const toggleDescription = (id: string) => {
    // Track expansion per ticket so the table does not collapse one row's state when another row changes.
    setExpandedDescriptions(current => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleTitle = (id: string) => {
    // Keep title expansion independent from description expansion for accurate per-row controls.
    setExpandedTitles(current => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <main>
      <header><div><span className="eyebrow">ACQUARIUS SUPPORT</span><h1>Ticket Tracker</h1></div><span className="count">{totalTickets} tickets</span></header>
      {error && <div className="error" role="alert">{error}</div>}
      <section className="toolbar">
        <input aria-label="Search tickets" placeholder="Search by title..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { setPage(1); void load(1) } }} />
        <select aria-label="Filter by status" value={status} onChange={e => { setPage(1); setStatus(e.target.value as TicketStatus | '') }}>
          <option value="">All statuses</option><option value="open">Open</option><option value="in_progress">In progress</option><option value="closed">Closed</option>
        </select>
        <select aria-label="Filter by priority" value={priorityFilter} onChange={e => { setPage(1); setPriorityFilter(e.target.value as TicketPriority | '') }}>
          <option value="">All priorities</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
        </select>
        <button className="secondary" onClick={() => { setPage(1); void load(1) }}>Search</button>
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
            <div className="summary-row">
              <div><span>Open</span><strong>{summary.byStatus.open ?? 0}</strong></div>
              <div><span>In progress</span><strong>{summary.byStatus.in_progress ?? 0}</strong></div>
              <div><span>Closed</span><strong>{summary.byStatus.closed ?? 0}</strong></div>
            </div>
            <div className="summary-row priority-summary">
              <div><span className="priority-label low">Low priority</span><strong>{summary.byPriority.low ?? 0}</strong></div>
              <div><span className="priority-label medium">Medium priority</span><strong>{summary.byPriority.medium ?? 0}</strong></div>
              <div><span className="priority-label high">High priority</span><strong>{summary.byPriority.high ?? 0}</strong></div>
            </div>
          </div>}
          {loading ? <div className="loading">Loading tickets...</div> : tickets.length === 0 ? <div className="empty">No tickets found</div> :
            <div className="table-wrap"><table><thead><tr><th>Ticket</th><th>Priority</th><th>Status</th><th></th></tr></thead><tbody>
              {tickets.map(ticket => <tr key={ticket.id}>
                <td>
                  {/* Truncate long titles in the table while preserving full text in the tooltip and expansion control. */}
                  {ticket.title.length > 60
                    ? <div className="ticket-title-block">
                        <strong className={expandedTitles.has(ticket.id) ? 'ticket-title expanded' : 'ticket-title'} title={ticket.title}>
                          {expandedTitles.has(ticket.id) ? ticket.title : `${ticket.title.slice(0, 60)}...`}
                        </strong>
                        <button type="button" className="description-toggle title-toggle" onClick={() => toggleTitle(ticket.id)}>
                          {expandedTitles.has(ticket.id) ? 'See less' : 'See more'}
                        </button>
                      </div>
                    : <strong className="ticket-title">{ticket.title}</strong>}
                  {!ticket.description
                    ? <small>No description</small>
                    : ticket.description.length > 120
                      ? <div className="ticket-description">
                          {/* Show a bounded preview before revealing the complete customer-provided description. */}
                          {expandedDescriptions.has(ticket.id)
                            ? <small>{ticket.description}</small>
                            : <small>{ticket.description.slice(0, 120)}...</small>}
                          <button type="button" className="description-toggle" onClick={() => toggleDescription(ticket.id)}>
                            {expandedDescriptions.has(ticket.id) ? 'See less' : 'See more'}
                          </button>
                        </div>
                      : <small>{ticket.description}</small>}
                </td>
                <td><span className={`badge ${ticket.priority}`}>{ticket.priority}</span></td>
                <td><select value={ticket.status} onChange={e => void changeStatus(ticket, e.target.value as TicketStatus)}><option value="open">Open</option><option value="in_progress">In progress</option><option value="closed">Closed</option></select></td>
                <td><button className="danger" onClick={() => void deleteTicket(ticket.id)}>Delete</button></td>
              </tr>)}
            </tbody></table></div>}
          {!loading && totalTickets > 5 &&
            <nav className="pagination" aria-label="Ticket pagination">
              <button type="button" className="secondary" disabled={page <= 1} onClick={() => setPage(current => current - 1)}>Previous</button>
              <span>Page {page} of {Math.ceil(totalTickets / 5)}</span>
              <button type="button" className="secondary" disabled={page >= Math.ceil(totalTickets / 5)} onClick={() => setPage(current => current + 1)}>Next</button>
            </nav>}
        </section>
      </div>
    </main>
  )
}

export default App
