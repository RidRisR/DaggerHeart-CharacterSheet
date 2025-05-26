# 字段引用统计（初步）

## 1. 组件中直接引用的字段

- cards
- armorName
- armorBaseScore
- armorThreshold
- armorFeature
- experience
- experienceValues
- gold
- weapons
- checkedUpgrades
- name
- level
- ancestry
- profession
- community
- strength
- dexterity
- intelligence
- wisdom
- charisma
- constitution
- agility
- finesse
- instinct
- presence
- knowledge
- maxHitPoints
- currentHitPoints
- temporaryHitPoints
- armor
- armorBoxes
- inventory
- hope
- characterBackground
- characterAppearance
- characterMotivation
- hp
- stress
- minorThreshold
- majorThreshold
- armorValue
- armorBonus
- armorMax
- hpMax
- stressMax
- primaryWeaponName
- primaryWeaponTrait
- primaryWeaponDamage
- primaryWeaponFeature
- secondaryWeaponName
- secondaryWeaponTrait
- secondaryWeaponDamage
- secondaryWeaponFeature
- inventoryWeapon1Name
- inventoryWeapon1Trait
- inventoryWeapon1Damage
- inventoryWeapon1Feature
- inventoryWeapon1Primary
- inventoryWeapon1Secondary
- inventoryWeapon2Name
- inventoryWeapon2Trait
- inventoryWeapon2Damage
- inventoryWeapon2Feature
- inventoryWeapon2Primary
- inventoryWeapon2Secondary

## 2. 组件中动态扩展但未在 form-data.ts 定义的字段

- companionExperience1, companionExperience2, ...
- companionExperienceValue1, companionExperienceValue2, ...
- companionImage
- companionDescription
- companionRange
- companionStressMax

## 3. 结论

- 存在部分字段未在 form-data.ts 明确定义，需补充或规范。
- 需进一步统计未被任何组件引用的字段，准备移除。

---

# 字段引用统计（自动化巡检补充）

## 4. 无引用/过时字段自动化检测结果

- silver
- copper

经全局全文检索，silver、copper 字段在 components、app、lib、data、hooks、refactor 等目录下均无实际引用，属于过时字段。

建议：
- 在 /lib/form-data.ts 的 FormData 类型定义中用 // @deprecated 标记。
- 后续移除并测试全链路无影响。

后续将继续细化字段引用与定义的对应关系，生成最终字段清单。
