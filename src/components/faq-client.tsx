// components/faq-client.tsx
"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function FAQClient() {
  return (
    <Accordion type="single" collapsible className="mt-4">
      <AccordionItem value="1">
        <AccordionTrigger>
          Apakah foto non-tanaman akan ditolak?
        </AccordionTrigger>
        <AccordionContent>
          Ya. Model kami memvalidasi objek dan menolak foto yang bukan tanaman.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="2">
        <AccordionTrigger>
          Bagaimana rekomendasi produk dibuat?
        </AccordionTrigger>
        <AccordionContent>
          Menggunakan vector search di MongoDB berdasar embedding deskripsi
          produk & kebutuhan tanaman.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="3">
        <AccordionTrigger>Bisakah saya mengekspor data?</AccordionTrigger>
        <AccordionContent>
          Bisa—riwayat tanaman, jadwal, dan foto dari halaman profil.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
