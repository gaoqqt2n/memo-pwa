// 静的サイトなので環境変数は自動注入されません。anon key は public 用です。
const SUPABASE_URL = 'https://pacbohgdcrmkihhxfekh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhY2JvaGdkY3Jta2loaHhmZWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MDQwNTYsImV4cCI6MjA4NTA4MDA1Nn0.ut8DNxgqz0NlF_oASTYbLBp5xNxYbCEse9rKBQgAqGc';
if (!window.supabase) { console.error('Supabase SDK が読み込まれていません。'); }
else { window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); }
