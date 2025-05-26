# 步骤1 字段引用与定义对应表

## 1.1 组件实际引用字段（含动态/模板字段）
- name
- characterName
- level
- proficiency
- ancestry
- ancestry1
- ancestry2
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
- weapons
- gold
- silver
- copper
- inventory
- experience
- experienceValues
- hope
- characterBackground
- characterAppearance
- characterMotivation
- cards
- checkedUpgrades
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
- armorName
- armorBaseScore
- armorThreshold
- armorFeature
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
- characterImage
- evasion
- subclass

### 动态伙伴相关字段（未在FormData定义）
- companionExperience1, companionExperience2, ...
- companionExperienceValue1, companionExperienceValue2, ...
- companionImage
- companionDescription
- companionRange
- companionStress
- companionEvasion
- companionStressMax

## 1.2 FormData接口定义字段（lib/form-data.ts）
（详见form-data.ts，略）

## 1.3 对应关系与差异
- 绝大多数主表字段已在FormData定义。
- 伙伴相关字段（companion*）未在FormData定义，但被三页组件大量动态引用。
- characterName、evasion、subclass等部分字段在组件有用，但FormData未定义。
- 需补充定义所有被引用但未定义的字段。
- 需标记未被任何组件引用的FormData字段，准备移除。

## 1.4 下一步建议
- 在FormData中补充所有被引用但未定义的字段。
- 标记未被引用的字段，准备移除。
- 进入类型系统强化与字段精简阶段。

---

本表为字段引用与定义的详细对应关系，供后续重构参考。
