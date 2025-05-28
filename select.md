### Summary of Button Actions in Page-One Header

#### Profession Button
1. **Trigger**: `openProfessionModal` is called.
2. **Action**: Sets `professionModalOpen` state to `true`.
3. **Modal**: Opens the `ProfessionSelectionModal`.
4. **Selection Handling**:
   - If a profession is selected, `handleProfessionChange` updates the `formData`.
   - If "none" is selected, the profession field in `formData` is cleared.
5. **Sync**: Marks `needsSyncRef` as `true` to synchronize cards.

#### Ancestry Button
1. **Trigger**: `openAncestryModal` is called with a field parameter (`ancestry1` or `ancestry2`).
2. **Action**: Sets `currentAncestryField` and `ancestryModalOpen` state to `true`.
3. **Modal**: Opens the `AncestrySelectionModal`.
4. **Selection Handling**:
   - If an ancestry is selected, `handleAncestryChange` updates the `formData`.
   - If "none" is selected, the ancestry field in `formData` is cleared.
5. **Sync**: Marks `needsSyncRef` as `true` to synchronize cards.

#### Community Button
1. **Trigger**: `openCommunityModal` is called.
2. **Action**: Sets `communityModalOpen` state to `true`.
3. **Modal**: Opens the `CommunitySelectionModal`.
4. **Selection Handling**:
   - If a community is selected, `handleCommunityChange` updates the `formData`.
   - If "none" is selected, the community field in `formData` is cleared.
5. **Sync**: Marks `needsSyncRef` as `true` to synchronize cards.

### Refactored Modal Logic

#### Generic Modal
1. **Opened By**: `openGenericModal`.
2. **Filtering**:
   - Filters cards based on `cardType` (`profession`, `ancestry`, or `community`).
   - Allows filtering by class using a dropdown.
   - Supports additional filters like `levelFilter` for ancestry.
3. **Selection**:
   - Clicking a card calls `onSelect` with the card ID and optional field.
   - Clicking "Clear Selection" calls `onSelect("none", field)`.
4. **Sync**:
   - Updates `formData` and marks `needsSyncRef` as `true` to synchronize cards`.
