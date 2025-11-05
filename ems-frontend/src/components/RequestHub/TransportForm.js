import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

export default function TransportForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [formData, setFormData] = useState({
    request_type: "transport",
    vehicle_type: "",
    pickup_location: "",
    dropoff_location: "",
    travel_date: "",
    passenger_count: 1,
    cargo_description: "",
    special_requirements: ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

    async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
        await api.post("/requests", {
        request_type: "transport",
        priority: "Medium",
        subject: `Transport Request: ${formData.vehicle_type}`,
        description: `Transport from ${formData.pickup_location} to ${formData.dropoff_location}`,
        lines: [
          {
            item_name: `${formData.vehicle_type} - ${formData.pickup_location} to ${formData.dropoff_location}`,  // Add this
            vehicle_type: formData.vehicle_type,
            pickup: formData.pickup_location,
            dropoff: formData.dropoff_location,
            travel_date: formData.travel_date,
            passengers: Number(formData.passenger_count) || 1,
            cargo: formData.cargo_description,
            special: formData.special_requirements,
            quantity: 1
          }
        ]
        });
        setMessage("✅ Transport request submitted successfully!");
        setTimeout(() => navigate("/dashobard/my-requests"), 2000);
    } catch (err) {
        console.error(err);
        setMessage("❌ Failed to submit request: " + (err.response?.data?.error || err.message));
    } finally {
        setLoading(false);
    }
    }



  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Transport Request</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="vehicle_type" className="block text-sm font-medium text-gray-700">
            Vehicle Type *
          </label>
          <select
            id="vehicle_type"
            name="vehicle_type"
            value={formData.vehicle_type}
            onChange={handleChange}
            required
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          >
            <option value="">Select vehicle type</option>
            <option value="sedan">Sedan</option>
            <option value="suv">SUV</option>
            <option value="van">Van</option>
            <option value="truck">Truck</option>
            <option value="bus">Bus</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="pickup_location" className="block text-sm font-medium text-gray-700">
            Pickup Location *
          </label>
          <input
            type="text"
            id="pickup_location"
            name="pickup_location"
            value={formData.pickup_location}
            onChange={handleChange}
            required
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            placeholder="Enter pickup address or location"
          />
        </div>

        <div>
          <label htmlFor="dropoff_location" className="block text-sm font-medium text-gray-700">
            Drop-off Location *
          </label>
          <input
            type="text"
            id="dropoff_location"
            name="dropoff_location"
            value={formData.dropoff_location}
            onChange={handleChange}
            required
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            placeholder="Enter drop-off address or location"
          />
        </div>

        <div>
          <label htmlFor="travel_date" className="block text-sm font-medium text-gray-700">
            Travel Date and Time *
          </label>
          <input
            type="datetime-local"
            id="travel_date"
            name="travel_date"
            value={formData.travel_date}
            onChange={handleChange}
            required
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
        </div>

        <div>
          <label htmlFor="passenger_count" className="block text-sm font-medium text-gray-700">
            Number of Passengers
          </label>
          <input
            type="number"
            id="passenger_count"
            name="passenger_count"
            value={formData.passenger_count}
            onChange={handleChange}
            min="1"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
        </div>

        <div>
          <label htmlFor="cargo_description" className="block text-sm font-medium text-gray-700">
            Cargo Description
          </label>
          <textarea
            id="cargo_description"
            name="cargo_description"
            value={formData.cargo_description}
            onChange={handleChange}
            rows={3}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            placeholder="Describe what needs to be transported..."
          />
        </div>

        <div>
          <label htmlFor="special_requirements" className="block text-sm font-medium text-gray-700">
            Special Requirements
          </label>
          <textarea
            id="special_requirements"
            name="special_requirements"
            value={formData.special_requirements}
            onChange={handleChange}
            rows={3}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            placeholder="Any special requirements (refrigeration, security, etc.)..."
          />
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
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Submit Request
          </button>
        </div>
      </form>
    </div>
  );
}