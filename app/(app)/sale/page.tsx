"use client";

import { useState } from "react";
import { SplitPane } from "@/components/shell/SplitPane";
import { ItemPicker } from "@/components/ui-kaif";
import { CartPanel } from "@/components/s3/CartPanel";
import { useCart } from "@/components/s3/useCart";

export default function SalePage() {
  const cart = useCart();
  const [reload, setReload] = useState(0);
  return (
    <SplitPane
      left={
        <ItemPicker key={reload} onPick={cart.add}
          priceField={cart.mode === "wholesale" ? "wholesale_price" : "retail_price"} />
      }
      right={<CartPanel type="SALE" cart={cart} onSaved={() => setReload((r) => r + 1)} />}
    />
  );
}
