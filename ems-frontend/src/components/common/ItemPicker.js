import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../services/api";

export default function ItemPicker({ value, onChange, placeholder = "Search items…" }) {
  const [q, setQ] = useState("");
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const debRef = useRef(null);

  const label = useMemo(() => {
    if (!value) return "";
    return value.name || value.itemName || value.item_name || value.code || `Item #${value.id}`;
  }, [value]);

  useEffect(() => {
    if (!q) { setOptions([]); return; }
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get("/items", { params: { q } });
        setOptions(data || []);
        setOpen(true);
      } catch (err) {
        console.error(err);
      }
    }, 250);
    return () => debRef.current && clearTimeout(debRef.current);
  }, [q]);

  return (
    <div className="relative">
      <input
        className="w-full border rounded-lg px-3 py-2"
        placeholder={placeholder}
        value={q || label}
        onFocus={() => { setQ(""); setOpen(true); }}
        onChange={(e) => setQ(e.target.value)}
      />
      {open && options.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg max-h-64 overflow-auto shadow">
          {options.map((opt) => {
            const text = opt.name || opt.itemName || opt.item_name || opt.code || `Item #${opt.id}`;
            const sub = [opt.uom, opt.category, opt.code].filter(Boolean).join(" · ");
            return (
              <div
                key={opt.id}
                onClick={() => { onChange(opt); setOpen(false); }}
                className="px-3 py-2 cursor-pointer hover:bg-gray-100"
              >
                <div className="text-sm">{text}</div>
                {sub && <div className="text-xs text-gray-500">{sub}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
