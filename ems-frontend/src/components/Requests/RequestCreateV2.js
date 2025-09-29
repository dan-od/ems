import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import ItemPicker from "../common/ItemPicker";

export default function RequestCreateV2() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState([]); // [{item, qty}]
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = useMemo(
    () => lines.length > 0 && lines.every(l => l.item && l.qty > 0),
    [lines]
  );

  const addLine = () => setLines(prev => [...prev, { item: null, qty: 1 }]);
  const removeLine = (idx) => setLines(prev => prev.filter((_, i) => i !== idx));
  const updateLineItem = (idx, item) =>
    setLines(prev => prev.map((l, i) => (i === idx ? { ...l, item } : l)));
  const updateLineQty = (idx, qty) =>
    setLines(prev => prev.map((l, i) => (i === idx ? { ...l, qty: Number(qty) || 0 } : l)));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const payload = {
        subject: subject || undefined,
        notes: notes || undefined,
        lines: lines.map(l => ({ itemId: l.item.id || l.item.itemId || l.item.item_id, qty: l.qty }))
      };
      const { data } = await api.post("/requests/v2", payload);
      navigate(`/dashboard/requests/${data?.id || ""}`);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to create request");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (lines.length === 0) addLine();
    // eslint-disable-next-line
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">New Request (v2: Mixed Items)</h1>
        <p className="text-sm text-gray-500">Add consumables and non-consumables in one request.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-3">
          <label className="text-sm font-medium">Subject (optional)</label>
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="e.g., Flowback package for Well-7"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div className="grid gap-3">
          <label className="text-sm font-medium">Notes (optional)</label>
          <textarea
            className="border rounded-lg px-3 py-2"
            rows={3}
            placeholder="Any extra details for the store/ops team…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Lines</h2>
            <button
              type="button"
              onClick={addLine}
              className="text-sm px-3 py-1 border rounded-lg"
            >
              + Add Line
            </button>
          </div>

          {lines.map((line, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-3 border rounded-xl p-3">
              <div className="col-span-8">
                <label className="text-xs text-gray-600">Item</label>
                <ItemPicker
                  value={line.item}
                  onChange={(item) => updateLineItem(idx, item)}
                  placeholder="Search item by name, code, or tag…"
                />
              </div>
              <div className="col-span-3">
                <label className="text-xs text-gray-600">Qty</label>
                <input
                  type="number"
                  min="1"
                  value={line.qty}
                  onChange={(e) => updateLineQty(idx, e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div className="col-span-1 flex items-end">
                <button
                  type="button"
                  onClick={() => removeLine(idx)}
                  className="text-red-600 text-sm underline"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2">
          <button
            disabled={!canSubmit || submitting}
            className={`px-4 py-2 rounded-lg text-white ${canSubmit && !submitting ? "bg-black" : "bg-gray-400 cursor-not-allowed"}`}
          >
            {submitting ? "Submitting…" : "Submit Request"}
          </button>
        </div>
      </form>
    </div>
  );
}
