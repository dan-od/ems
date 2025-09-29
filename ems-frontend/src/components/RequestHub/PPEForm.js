import { useState } from "react";
import api from "../../services/api";
import { useNavigate } from "react-router-dom";

export default function PPEForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ item: "", quantity: 1, priority: "Medium" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/requests", {
        request_type: "ppe",
        priority: form.priority,
        subject: `PPE Request: ${form.item}`,
        description: `Request for ${form.quantity} units of ${form.item}`,
        lines: [{
          name: form.item,
          quantity: Number(form.quantity) || 1,
        }],
      });
      setMessage("✅ PPE request submitted successfully!");
      setForm({ item: "", quantity: 1, priority: "Medium" });
      setTimeout(() => navigate("/requests"), 2000);
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to submit request: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6">PPE Request</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block font-medium mb-1">PPE Item *</label>
            <input
              name="item"
              value={form.item}
              onChange={handleChange}
              className="w-full border p-2 rounded"
              placeholder="E.g. Safety Helmet"
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Quantity *</label>
            <input
              type="number"
              name="quantity"
              value={form.quantity}
              min="1"
              onChange={handleChange}
              className="w-full border p-2 rounded"
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Priority</label>
            <select
              name="priority"
              value={form.priority}
              onChange={handleChange}
              className="w-full border p-2 rounded"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate("/requests")}
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