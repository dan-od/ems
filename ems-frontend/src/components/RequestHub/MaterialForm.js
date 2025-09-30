import { useState } from "react";
import { useNavigate } from "react-router-dom";  // ✅ Add this
import api from "../../services/api";

export default function MaterialForm() {
  const navigate = useNavigate();  // ✅ Add this
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
        subject: `Material Request: ${items.length} item(s)`,
        description: items.map(it => `${it.name} (${it.quantity})`).join(', '),
        lines: items.map((it) => ({
          item_name: it.name,  // ✅ Changed from "name" to "item_name"
          quantity: Number(it.quantity) || 0,
        })),
      });
      setMessage("✅ Material request submitted successfully!");
      setItems([{ name: "", quantity: 1 }]);
      setTimeout(() => navigate("/dashboard/my-requests"), 2000);  // ✅ Add navigation
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
        <h2 className="text-2xl font-bold">Material Request</h2>
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
                  className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600"
                >
                  Remove
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addItem}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + Add another item
          </button>

          <div>
            <label className="block font-medium mb-1">Priority</label>
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

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate("/dashboard/requests")}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>

        {message && <p className="mt-4 text-center">{message}</p>}
      </div>
    </div>
  );
}