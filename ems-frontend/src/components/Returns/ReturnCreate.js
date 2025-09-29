import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../services/api";

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

export default function ReturnCreate() {
  const query = useQuery();
  const navigate = useNavigate();
  const initialIssueId = query.get("issueId") || "";
  const [issueId, setIssueId] = useState(initialIssueId);
  const [issue, setIssue] = useState(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // returnLines keyed by issueLineId
  // consumable: { qty }
  // non-consumable: { assetId, condition }
  const [returnLines, setReturnLines] = useState({});

  const loadIssue = async (id) => {
    if (!id) return;
    try {
      const { data } = await api.get(`/issues/${id}`);
      // Expect data.lines with: { id (issueLineId), itemId, is_consumable, qty (issued qty), assetId? }
      setIssue(data);
      const seed = {};
      (data?.lines || []).forEach(ln => {
        seed[ln.id] = ln.is_consumable ? { qty: ln.qty || 1 } : { assetId: ln.assetId, condition: "OK" };
      });
      setReturnLines(seed);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to load issue");
    }
  };

  useEffect(() => {
    if (initialIssueId) loadIssue(initialIssueId);
    // eslint-disable-next-line
  }, [initialIssueId]);

  const handleLoad = (e) => {
    e.preventDefault();
    if (issueId) loadIssue(issueId);
  };

  const updateQty = (lineId, qty) =>
    setReturnLines(prev => ({ ...prev, [lineId]: { ...prev[lineId], qty: Number(qty) || 0 } }));

  const updateCondition = (lineId, condition) =>
    setReturnLines(prev => ({ ...prev, [lineId]: { ...prev[lineId], condition } }));

  const canSubmit = useMemo(() => {
    if (!issue) return false;
    return (issue.lines || []).every(ln => {
      const s = returnLines[ln.id];
      if (!s) return false;
      return ln.is_consumable ? (s.qty > 0) : !!s.condition;
    });
  }, [issue, returnLines]);

  const submitReturn = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const payload = {
        issueId: issue.id,
        notes: notes || undefined,
        lines: (issue.lines || []).map(ln => {
          const s = returnLines[ln.id];
          if (ln.is_consumable) {
            return { issueLineId: ln.id, qty: s.qty };
          }
          return { issueLineId: ln.id, assetId: ln.assetId, condition: s.condition || "OK" };
        })
      };
      const { data } = await api.post("/returns", payload);
      navigate(`/dashboard/returns/${data?.id || ""}`);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to create return");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Create Return (Field → Store)</h1>

      <form onSubmit={handleLoad} className="flex items-end gap-3 mb-6">
        <div>
          <label className="text-sm">Issue ID</label>
          <input
            className="border rounded-lg px-3 py-2 ml-2"
            value={issueId}
            onChange={(e) => setIssueId(e.target.value)}
            placeholder="e.g., 101"
          />
        </div>
        <button className="px-4 py-2 border rounded-lg" type="submit">Load</button>
      </form>

      {issue && (
        <div className="space-y-6">
          <div className="grid gap-2">
            <div className="text-sm text-gray-600">Waybill</div>
            <div className="font-medium">{issue.waybillNo || "—"}</div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Notes (optional)</label>
            <textarea
              className="border rounded-lg px-3 py-2"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Condition notes, missing items, damages, etc."
            />
          </div>

          <div className="space-y-4">
            <h2 className="font-medium">Lines to Return</h2>
            {(issue.lines || []).map((ln) => (
              <div key={ln.id} className="border rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">
                    {ln.itemName || `Item #${ln.itemId}`}
                    <span className="text-xs ml-2 px-2 py-0.5 rounded-full border">
                      {ln.is_consumable ? "Consumable" : "Asset"}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Issued: {ln.qty}{ln.uom ? ` ${ln.uom}` : ""}
                  </div>
                </div>

                {ln.is_consumable ? (
                  <div className="grid grid-cols-2 gap-3 max-w-lg">
                    <div>
                      <label className="text-xs text-gray-600">Qty Returned</label>
                      <input
                        type="number"
                        min="1"
                        className="border rounded-lg px-3 py-2 w-40"
                        value={returnLines[ln.id]?.qty || 0}
                        onChange={(e) => updateQty(ln.id, e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 max-w-2xl">
                    <div>
                      <div className="text-xs text-gray-600">Asset ID</div>
                      <div className="font-medium">{ln.assetId}</div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Condition</label>
                      <select
                        className="border rounded-lg px-3 py-2 w-48"
                        value={returnLines[ln.id]?.condition || "OK"}
                        onChange={(e) => updateCondition(ln.id, e.target.value)}
                      >
                        <option value="OK">OK</option>
                        <option value="Needs Inspection">Needs Inspection</option>
                        <option value="Damaged">Damaged</option>
                        <option value="Repair">Repair</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div>
            <button
              disabled={!canSubmit || submitting}
              onClick={submitReturn}
              className={`px-4 py-2 rounded-lg text-white ${canSubmit && !submitting ? "bg-black" : "bg-gray-400 cursor-not-allowed"}`}
            >
              {submitting ? "Submitting…" : "Create Return"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
