-- Persist control layer summary on pending fixes for safe approve/PR after restart

alter table bootrise_pending_fixes
  add column if not exists control_layer jsonb;
