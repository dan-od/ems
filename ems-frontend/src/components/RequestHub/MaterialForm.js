import { useState } from "react";
import api from "../../services/api";

export default function MaterialForm() {
  const [items, setItems] = useState([{ name: "", quantity: 1 }]);
  const [priority, setPriority] = useState("Medium");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function handleItemChange(index, field, value) {
    const updated = [...items];
    updated[index][field] = field === "quantity" ? Number(value) || 0 : value;
    setItems(updated);
  }

  function addItem() {
    setItems([...items, { name: "", quantity: 1 }]);
  }

  function removeItem(index) {
    setItems(items.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/requests", {
        request_type: "material",
        priority,
        lines: items.map((it) => ({
          name: it.name,
          quantity: Number(it.quantity) || 0,
        })),
      });
      setMessage("✅ Material request submitted successfully!");
      setItems([{ name: "", quantity: 1 }]);
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to submit request");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-md p-6 space-y-6">
        <h2 className="text-2xl font-bold text-wfsl-orange">Material Request</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Item name"
                value={item.name}
                onChange={(e) => handleItemChange(index, "name", e.target.value)}
                className="flex-1 border p-2 rounded"
                required
              />
              <input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                className="w-24 border p-2 rounded"
                required
              />
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="bg-wfsl-orange text-white px-3 py-1 rounded hover:bg-wfsl-orangeDark"
                >
                  Remove
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addItem}
            className="bg-wfsl-orange text-white px-4 py-2 rounded hover:bg-wfsl-orangeDark"
          >
            + Add another item
          </button>

          <div>
            <label className="block font-medium">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full border p-2 rounded"
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Urgent</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-wfsl-orange text-white py-2 rounded hover:bg-wfsl-orangeDark transition"
          >
            {loading ? "Submitting..." : "Submit Request"}
          </button>
        </form>

        {message && <p className="mt-4">{message}</p>}
      </div>
    </div>
  );
}