import fs from 'fs';
import path from 'path';
import { parseTCX } from '../utils/tcxParser';
import Dashboard from '../components/Dashboard';

export default function Home() {
  // Read the default TCX activity from the public folder on the server
  const filePath = path.join(process.cwd(), 'public', 'activity.tcx');
  const tcxText = fs.readFileSync(filePath, 'utf-8');
  const initialActivity = parseTCX(tcxText);

  return <Dashboard initialActivity={initialActivity} />;
}
