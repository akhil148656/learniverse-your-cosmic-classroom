import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const root = document.getElementById("root");
const missingEnv = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (root) {
	createRoot(root).render(
		missingEnv ? (
			<div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
				<div className="max-w-xl w-full rounded-xl border border-border bg-card p-6 shadow-lg">
					<h1 className="text-2xl font-semibold mb-2">Missing Supabase configuration</h1>
					<p className="text-sm text-muted-foreground mb-4">
						Set the following environment variables in your hosting provider and redeploy:
					</p>
					<ul className="text-sm space-y-1">
						<li>VITE_SUPABASE_URL</li>
						<li>VITE_SUPABASE_PUBLISHABLE_KEY</li>
					</ul>
				</div>
			</div>
		) : (
			<App />
		)
	);
}
