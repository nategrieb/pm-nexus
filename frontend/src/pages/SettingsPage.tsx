import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSettings, updateSettings, testConnection } from "../api/settings";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });

  const [form, setForm] = useState({
    jira_base_url: "",
    jira_email: "",
    jira_api_token: "",
    jira_story_points_field: "story_points",
    unpointed_buffer: 3,
  });
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (settings) {
      const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
      setForm((prev) => ({
        ...prev,
        jira_base_url: map.jira_base_url || "",
        jira_email: map.jira_email || "",
        jira_story_points_field: map.jira_story_points_field || "story_points",
        unpointed_buffer: parseInt(map.unpointed_buffer || "3", 10),
        // Don't overwrite token field with masked value
      }));
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: () => updateSettings(form),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });

  const testMutation = useMutation({
    mutationFn: testConnection,
    onSuccess: (data) => setTestResult(data),
  });

  const handleSave = async () => {
    await saveMutation.mutateAsync();
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Settings</h1>

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <h2 className="text-lg font-semibold text-slate-700">
          Jira Connection
        </h2>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Jira Base URL
          </label>
          <input
            type="url"
            placeholder="https://yourcompany.atlassian.net"
            value={form.jira_base_url}
            onChange={(e) =>
              setForm({ ...form, jira_base_url: e.target.value })
            }
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Email
          </label>
          <input
            type="email"
            placeholder="you@company.com"
            value={form.jira_email}
            onChange={(e) => setForm({ ...form, jira_email: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            API Token
          </label>
          <input
            type="password"
            placeholder="Enter your Jira API token"
            value={form.jira_api_token}
            onChange={(e) =>
              setForm({ ...form, jira_api_token: e.target.value })
            }
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <hr className="border-slate-200" />

        <h2 className="text-lg font-semibold text-slate-700">Jira Fields</h2>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Story Points Field
          </label>
          <input
            type="text"
            placeholder="story_points or customfield_10016"
            value={form.jira_story_points_field}
            onChange={(e) =>
              setForm({ ...form, jira_story_points_field: e.target.value })
            }
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-slate-400 mt-1">
            The Jira field name for story points. Common values:
            story_points, customfield_10016, customfield_10028
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Unpointed Ticket Buffer
          </label>
          <input
            type="number"
            min={1}
            max={20}
            value={form.unpointed_buffer}
            onChange={(e) =>
              setForm({
                ...form,
                unpointed_buffer: parseInt(e.target.value, 10) || 3,
              })
            }
            className="w-24 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-slate-400 mt-1">
            Points assumed for unpointed tickets in timeline forecasting.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saveMutation.isPending ? "Saving..." : "Save Settings"}
          </button>
          <button
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            {testMutation.isPending && (
              <Loader2 size={16} className="animate-spin" />
            )}
            Test Connection
          </button>
        </div>

        {saveMutation.isSuccess && (
          <p className="text-sm text-emerald-600">Settings saved.</p>
        )}

        {testResult && (
          <div
            className={`flex items-center gap-2 text-sm ${
              testResult.success ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {testResult.success ? (
              <CheckCircle size={16} />
            ) : (
              <XCircle size={16} />
            )}
            {testResult.message}
          </div>
        )}
      </div>
    </div>
  );
}
