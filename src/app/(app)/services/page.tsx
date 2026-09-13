"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { useData } from "@/data";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  AddServiceDialog,
  ServicesSection,
} from "../settings/_components/services-section";

export default function ServicesPage() {
  const { services } = useData();
  const [addOpen, setAddOpen] = React.useState(false);
  const count = services.filter((s) => s.active !== false).length;

  return (
    <>
      <PageHeader
        title="Services"
        subtitle={`${count} on the menu`}
        actions={
          <Button type="button" onClick={() => setAddOpen(true)}>
            <Plus data-icon="inline-start" strokeWidth={1.75} />
            Add service
          </Button>
        }
      />
      <AddServiceDialog open={addOpen} onOpenChange={setAddOpen} />
      <ServicesSection />
    </>
  );
}
