import { supabase } from './supabase'

export type TelemetryEvent = {
  event_type: string
  payload?: Record<string, any>
}

export async function emitTelemetry(evt: TelemetryEvent) {
  try {
    const sessionId = getSessionId()
    const { error } = await supabase.from('learning_events' as any).insert({
      event_type: evt.event_type,
      payload: evt.payload ?? {},
      session_id: sessionId,
    })
    if (error) {
      // Non-fatal: log locally for dev
      console.warn('Telemetry insert failed', error.message)
    }
  } catch (e) {
    console.warn('Telemetry error', e)
  }
}

function getSessionId(): string {
  const key = 'electriscribe_session_id'
  let sid = localStorage.getItem(key)
  if (!sid) {
    sid = Math.random().toString(36).slice(2)
    localStorage.setItem(key, sid)
  }
  return sid
}

