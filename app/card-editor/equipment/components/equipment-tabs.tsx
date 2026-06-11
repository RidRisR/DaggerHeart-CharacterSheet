"use client";

import { Shield, Swords, Settings } from "lucide-react";
import type { CardPackageState } from "@/app/card-editor/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEquipmentEditorStore } from "../equipment-editor-store";
import { ArmorItemTab, WeaponItemTab } from "./equipment-item-tab";
import { EquipmentMetadataTab } from "./equipment-metadata-tab";

interface EquipmentTabsProps {
  cardPackage: CardPackageState;
  onRequestCopyFromCard(): void;
}

export function EquipmentTabs({
  onRequestCopyFromCard,
}: EquipmentTabsProps) {
  const store = useEquipmentEditorStore();

  return (
    <Tabs
      value={store.selectedTab}
      onValueChange={(value) =>
        store.setSelectedTab(value as typeof store.selectedTab)
      }
    >
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="metadata" className="flex items-center gap-1">
          <Settings className="h-4 w-4" />
          基础信息
        </TabsTrigger>
        <TabsTrigger value="weapons" className="flex items-center gap-1">
          <Swords className="h-4 w-4" />
          武器
        </TabsTrigger>
        <TabsTrigger value="armor" className="flex items-center gap-1">
          <Shield className="h-4 w-4" />
          护甲
        </TabsTrigger>
      </TabsList>

      <TabsContent value="metadata">
        <EquipmentMetadataTab
          draft={store.draft}
          onUpdate={store.updateMetadata}
          onRequestCopyFromCard={onRequestCopyFromCard}
        />
      </TabsContent>
      <TabsContent value="weapons">
        <WeaponItemTab
          packageName={store.draft.name}
          author={store.draft.author}
          items={store.draft.equipment.weapons}
          selectedIndex={store.selectedWeaponIndex}
          onSelect={store.setSelectedWeaponIndex}
          onAdd={store.addWeapon}
          onDuplicate={store.duplicateWeapon}
          onDelete={store.deleteWeapon}
          onUpdate={store.updateWeapon}
        />
      </TabsContent>
      <TabsContent value="armor">
        <ArmorItemTab
          packageName={store.draft.name}
          author={store.draft.author}
          items={store.draft.equipment.armor}
          selectedIndex={store.selectedArmorIndex}
          onSelect={store.setSelectedArmorIndex}
          onAdd={store.addArmor}
          onDuplicate={store.duplicateArmor}
          onDelete={store.deleteArmor}
          onUpdate={store.updateArmor}
        />
      </TabsContent>
    </Tabs>
  );
}
