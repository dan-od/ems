import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../services/api";

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

export default function IssueCreate() {
  const navigate = useNavigate();
  const query = useQuery();
  const initialRequestId = query.get("requestId") || "";
  const [requestId, setRequestId] = useState(initialRequestId);
  const [request, setRequest] = useState(null);
  const [waybillNo, setWaybillNo] = useState("");
  const [issuing, setIssuing] = useState(false);

  // dynamic issue lines state keyed by requestLineId
  const [issueLines, setIssueLines] = useState({}); 
  // structure: {
  //   [requestLineId]: { qty: number (for consumables), assets: [assetId,...] (for non-consumables) }
  // }

  const loadRequest = async (id) => {
    if (!id) return;
    try {
      const { data } = await api.get(`/requests/${id}`);
      // Expect data.lines: [{ id, itemId, itemName, is_consumable, uom, qty }]
      setRequest(data);
      // seed line state
      const seed = {};
      (data?.lines || []).forEach((ln) => {
        seed[ln.id] = ln.is_consumable ? { qty: ln.qty || 1 } : { assets: [] };
      });
      setIssueLines(seed);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to load request");
    }
  };

  useEffect(() => {
    if (initialRequestId) loadRequest(initialRequestId);
    // eslint-disable-next-line
  }, [initialRequestId]);

  const handleLoad = (e) => {
    e.preventDefault();
    if (requestId) loadRequest(requestId);
  };

  const updateQty = (lineId, qty) =>
    setIssueLines(prev => ({ ...prev, [lineId]: { ...prev[lineId], qty: Number(qty) || 0 } }));

  const updateAssets = (lineId, list) =>
    setIssueLines(prev => ({ ...prev, [lineId]: { ...prev[lineId], assets: list } }));

  const canSubmit = useMemo(() => {
    if (!request || !waybillNo) return false;
    return (request.lines || []).every(ln => {
      const s = issueLines[ln.id];
      if (!s) return false;
      return ln.is_consumable ? (s.qty > 0) : ((s.assets || []).length > 0);
    });
  }, [request, issueLines, waybillNo]);

  // helper to load available assets by item (for non-consumables)
  const [assetOptions, setAssetOptions] = useState({}); // {itemId: [{id, tag, serial}], ...}
  const loadAssets = async (itemId) => {
    if (!itemId) return;
    try {
      const { data } = await api.get(`/assets`, { params: { itemId } });
      setAssetOptions(prev => ({ ...prev, [itemId]: data || [] }));
    } catch (err) {
      console.error(err);
      // fallback silent
    }
  };

  const submitIssue = async () => {
    if (!canSubmit) return;
    setIssuing(true);
    try {
      const payload = {
        requestId: request.id,
        waybillNo: waybillNo,
        lines: (request.lines || []).map(ln => {
          const s = issueLines[ln.id];
          if (ln.is_consumable) {
            return { requestLineId: ln.id, itemId: ln.itemId, qty: s.qty };
          }
          // non-consumable: one line per selected asset
          // backend also supports single line with assetId; we’ll expand for clarity
          // If your backend expects one asset per line, this is correct.
          return s.assets.map(assetId => ({
            requestLineId: ln.id,
            itemId: ln.itemId,
            assetId
          }));
        }).flat()
      };
      const { data } = await api.post("/issues", payload);
      navigate(`/dashboard/issues/${data?.id || ""}`);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to create issue");
    } finally {
      setIssuing(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Create Issue (Store → Field)</h1>

      <form onSubmit={handleLoad} className="flex items-end gap-3 mb-6">
        <div>
          <label className="text-sm">Request ID</label>
          <input
            className="border rounded-lg px-3 py-2 ml-2"
            value={requestId}
            onChange={(e) => setRequestId(e.target.value)}
            placeholder="e.g., 42"
          />
        </div>
        <button className="px-4 py-2 border rounded-lg" type="submit">Load</button>
      </form>

      {request && (
        <div className="space-y-6">
          <div className="grid gap-2">
            <div className="text-sm text-gray-600">Subject</div>
            <div className="font-medium">{request.subject || "—"}</div>
            <div className="text-sm text-gray-600">Notes</div>
            <div>{request.notes || "—"}</div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Waybill No.</label>
            <input
              className="border rounded-lg px-3 py-2 max-w-sm"
              value={waybillNo}
              onChange={(e) => setWaybillNo(e.target.value)}
              placeholder="e.g., WB-1001"
            />
          </div>

          <div className="space-y-4">
            <h2 className="font-medium">Lines to Issue</h2>
            {(request.lines || []).map((ln) => (
              <div key={ln.id} className="border rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">
                    {ln.itemName || ln.item_name || `Item #${ln.itemId}`}
                    <span className="text-xs ml-2 px-2 py-0.5 rounded-full border">
                      {ln.is_consumable ? "Consumable" : "Asset"}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Requested: {ln.qty} {ln.uom || ""}
                  </div>
                </div>

                {ln.is_consumable ? (
                  <div className="grid grid-cols-2 gap-3 max-w-lg">
                    <div>
                      <label className="text-xs text-gray-600">Qty to Issue</label>
                      <input
                        type="number"
                        min="1"
                        className="border rounded-lg px-3 py-2 w-40"
                        value={issueLines[ln.id]?.qty || 0}
                        onChange={(e) => updateQty(ln.id, e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <label className="text-xs text-gray-600">Select Assets</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => loadAssets(ln.itemId)}
                        className="text-sm px-3 py-1 border rounded-lg"
                      >
                        Load available
                      </button>
                      <span className="text-xs text-gray-500">
                        (pulls `/assets?itemId={itemId}`)
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {(assetOptions[ln.itemId] || []).map((a) => {
                        const cur = issueLines[ln.id]?.assets || [];
                        const checked = cur.includes(a.id);
                        const toggle = () => {
                          const next = checked
                            ? cur.filter(id => id !== a.id)
                            : [...cur, a.id];
                          updateAssets(ln.id, next);
                        };
                        const label = a.tag || a.asset_tag || a.serial || `Asset #${a.id}`;
                        return (
                          <label key={a.id} className="flex items-center gap-1 border rounded-lg px-2 py-1">
                            <input type="checkbox" checked={checked} onChange={toggle} />
                            <span className="text-sm">{label}</span>
                          </label>
                        );
                      })}
                    </div>

                    {/* Fallback manual entry */}
                    <div className="mt-2">
                      <label className="text-xs text-gray-600">Or enter asset IDs (comma-separated)</label>
                      <input
                        className="border rounded-lg px-3 py-2 w-full"
                        placeholder="e.g., 12,18,24"
                        value={(issueLines[ln.id]?.assets || []).join(",")}
                        onChange={(e) => {
                          const ids = e.target.value
                            .split(",")
                            .map(s => Number(s.trim()))
                            .filter(Boolean);
                          updateAssets(ln.id, ids);
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div>
            <button
              disabled={!canSubmit || issuing}
              onClick={submitIssue}
              className={`px-4 py-2 rounded-lg text-white ${canSubmit && !issuing ? "bg-black" : "bg-gray-400 cursor-not-allowed"}`}
            >
              {issuing ? "Issuing…" : "Create Issue"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
