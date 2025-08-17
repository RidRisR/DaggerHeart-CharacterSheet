import React from 'react';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ImageUploadCrop } from '@/components/ui/image-upload-crop';
import { useSheetStore, useSafeSheetData } from '@/lib/sheet-store';
import { defaultSheetData } from '@/lib/default-sheet-data';
import { PageHeader } from '@/components/page-header';

const MAX_STRESS = (formData: any) => Number(formData.companionStressMax) || 3;
const TOTAL_STRESS = 6;

const CharacterSheetPageThree: React.FC = () => {
    const { sheetData: formData, setSheetData: onFormDataChange } = useSheetStore();
    const safeFormData = useSafeSheetData();

    // 伙伴经验区块（右侧为图片+描述，无经验示例）
    const renderCompanionExperienceSection = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 mb-3 print:grid-cols-2 print:gap-x-8 print:mb-3">
            {/* 伙伴描述区：左半区，带边框 */}
            <div className="flex flex-col justify-end w-full p-3 border border-transparent rounded-t-md rounded-b-md bg-white">
                <h3 className="font-bold text-md mb-2">伙伴描述</h3>
                <div className="flex flex-col items-center">
                    <ImageUploadCrop
                        currentImage={safeFormData.companionImage}
                        onImageChange={(imageBase64) =>
                            onFormDataChange({ ...formData, companionImage: imageBase64 })
                        }
                        width="9rem"
                        height="9rem"
                        placeholder={{ title: "伙伴图像", subtitle: "点击上传" }}
                        inputId="companion-image-upload"
                        className="mb-2 print:w-28 print:h-28"
                    />
                    <textarea
                        rows={6}
                        id="companionDescription"
                        name="companionDescription"
                        value={safeFormData.companionDescription || ''}
                        onChange={e => onFormDataChange({ ...formData, companionDescription: e.target.value })}
                        className="block w-full text-xs border border-gray-300 dark:border-gray-700 rounded px-2 py-1 bg-gray-50 dark:bg-gray-900 print:bg-white print:shadow-none focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 resize-none shadow-inner min-h-[7rem] max-h-[10rem] print:min-h-[5rem] print:max-h-[8rem]"
                        placeholder="伙伴描述（如性格、外貌等）"
                        maxLength={180}
                        style={{ minHeight: '6rem', maxHeight: '9rem' }}
                    />
                </div>
            </div>
            {/* 伙伴经验区：右半区，带边框 */}
            <div className="flex flex-col justify-end w-full p-3 border border-transparent dark:border-transparent rounded-t-md rounded-b-md bg-white dark:bg-gray-900">
                <h3 className="font-bold text-md mb-2 text-gray-800 dark:text-gray-200">伙伴经历</h3>
                <div className="flex flex-col gap-2">
                    {(safeFormData.companionExperience || ["", "", "", "", ""]).map((exp, i) => (
                        <div key={`companion-exp-${i}`} className="flex items-center gap-2 mb-1">
                            <input
                                type="text"
                                name={`companionExperience${i + 1}`}
                                value={exp || ''}
                                onChange={e => {
                                    const newArr = [...(safeFormData.companionExperience || ["", "", "", "", ""])]
                                    newArr[i] = e.target.value
                                    onFormDataChange({ ...formData, companionExperience: newArr })
                                }}
                                className="w-full border-b-2 border-gray-400 rounded-none text-base print-empty-hide bg-transparent focus:outline-none focus:border-blue-500 transition-all duration-150"
                                placeholder="经历描述"
                                style={{ minHeight: '2.5rem' }}
                            />
                            <input
                                type="text"
                                name={`companionExperienceValue${i + 1}`}
                                value={(safeFormData.companionExperienceValue || ["", "", "", "", ""])[i] || ''}
                                onChange={e => {
                                    const newArr = [...(safeFormData.companionExperienceValue || ["", "", "", "", ""])]
                                    newArr[i] = e.target.value
                                    onFormDataChange({ ...formData, companionExperienceValue: newArr })
                                }}
                                className="w-12 border-b-2 border-gray-400 rounded-none ml-2 text-center text-base print-empty-hide bg-transparent focus:outline-none focus:border-blue-500 transition-all duration-150"
                                placeholder="#"
                                style={{ minHeight: '2.5rem' }}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
    // 攻击骰选择 ToggleGroup（已与第一页一致）
    const renderAttackDice = () => (
        <ToggleGroup type="single" value={safeFormData.companionRange || ''} onValueChange={val => onFormDataChange({ ...formData, companionRange: val })} className="flex space-x-2 mt-1">
            {['D6', 'D8', 'D10', 'D12'].map(r => (
                <ToggleGroupItem key={r} value={r} className="px-2 py-1 text-xs rounded border border-gray-400 data-[state=on]:bg-blue-600 data-[state=on]:text-white">
                    {r}
                </ToggleGroupItem>
            ))}
        </ToggleGroup>
    );

    // 训练区块复用升级区块风格，复选框风格与第一页一致
    const renderTrainingOption = (mainText: string, namePrefix: keyof NonNullable<typeof safeFormData.trainingOptions>, checkboxCount: number) => {
        const parts = mainText.split(/：|:/);
        const title = parts[0];
        const desc = parts.length > 1 ? parts.slice(1).join(':').trim() : '';
        const arr = safeFormData.trainingOptions?.[namePrefix] || [];

        return (
            <div className="flex items-start gap-2 mb-1 text-[13px] leading-[1.6]">
                {/* 格子区，右对齐，预留3格宽度 */}
                <span className="flex flex-shrink-0 items-center justify-end gap-0.5 mt-px" style={{ minWidth: '3.2em' }}>
                    {Array(3 - checkboxCount).fill(0).map((_, i) => (
                        <span key={`empty-${i}`} className="inline-block align-middle w-[1em] h-[1em]" />
                    ))}
                    {Array(checkboxCount).fill(0).map((_, i) => {
                        const checked = arr[i] || false;
                        return (
                            <span
                                key={`${namePrefix}-${i}`}
                                className={`inline-block align-middle w-[1em] h-[1em] border border-gray-800 ${checked ? 'bg-gray-800' : 'bg-white'} cursor-pointer transition-colors`}
                                style={{ borderRadius: '2px', marginLeft: i === 0 && (3 - checkboxCount) === 0 ? 0 : '0.08em' }}
                                onClick={() => {
                                    const newArr = [...arr];
                                    newArr[i] = !newArr[i];
                                    onFormDataChange({
                                        ...formData,
                                        trainingOptions: {
                                            ...defaultSheetData.trainingOptions,
                                            ...safeFormData.trainingOptions,
                                            [namePrefix]: newArr,
                                        } as any,
                                    });
                                }}
                                tabIndex={0}
                                aria-checked={!!checked}
                                role="checkbox"
                            />
                        );
                    })}
                </span>
                {/* 标题和描述 - wrapped in a div that takes remaining space and allows its content to wrap */}
                <div className="flex-1">
                    <span className="font-bold text-gray-800 dark:text-gray-200 mr-1">{title}</span>
                    {desc && <span className="text-gray-600 dark:text-gray-300">{desc}</span>}
                </div>
            </div>
        );
    };

    // 闪避输入框（与第一页一致）
    const renderEvasion = () => (
        <div className="flex flex-col items-center">
            <div className="text-ms font-bold">闪避</div>
            <input
                type="text"
                name="companionEvasion"
                value={safeFormData.companionEvasion || ''}
                onChange={e => onFormDataChange({ ...formData, companionEvasion: e.target.value })}
                className="w-10 text-center bg-transparent border-b border-gray-400 focus:outline-none text-xl font-bold print-empty-hide"
                placeholder="10"
            />
        </div>
    );

    // 统一压力格渲染与第一页一致
    const renderStressBoxes = () => {
        const max = MAX_STRESS(formData);
        // 兼容旧数据，确保是数组
        const stressArr = Array.isArray(safeFormData.companionStress)
            ? safeFormData.companionStress.slice(0, TOTAL_STRESS)
            : Array(TOTAL_STRESS).fill(false);
        return (
            <div className="flex gap-1 flex-wrap">
                {Array(TOTAL_STRESS).fill(0).map((_, i) => (
                    <div
                        key={`companion-stress-${i}`}
                        className={`w-4 h-4 border-2 ${i < max ? "border-gray-800 cursor-pointer" : "border-gray-400 border-dashed"} ${stressArr[i] ? "bg-gray-800" : "bg-white"}`}
                        onClick={() => {
                            if (i < max) {
                                const newArr = [...stressArr];
                                newArr[i] = !newArr[i];
                                onFormDataChange({ ...formData, companionStress: newArr });
                            }
                        }}
                        tabIndex={i < max ? 0 : -1}
                        aria-checked={!!stressArr[i]}
                        role="checkbox"
                    />
                ))}
            </div>
        );
    };

    const sectionBannerClass = "bg-gray-700 text-white font-bold py-1 px-3 text-center text-sm tracking-wider uppercase rounded-t-lg";

    return (
        <>
            {/* 固定位置的按钮 - 移除建卡指引按钮，因为已经移到父组件 */}
            <div></div>

            <div className="w-full max-w-[210mm] mx-auto">
                <div
                    className="a4-page p-2 bg-white text-gray-800 shadow-lg print:shadow-none rounded-md"
                    style={{ width: "210mm" }}
                >
            {/* Header Section - 黑色顶盖 */}
            <PageHeader />
            {/* Header Section */}
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-200">游侠伙伴</h1>
                </div>
                <div className="text-center">
                    {renderEvasion()}
                </div>
            </div>
            {/* Companion Name */}
            <div className="mb-4">
                <label htmlFor="companionName" className="block text-xs uppercase tracking-wider mb-0.5 font-medium text-gray-600 dark:text-gray-400">伙伴名称</label>
                <Input
                    type="text"
                    id="companionName"
                    name="companionName"
                    value={safeFormData.companionName || ''}
                    onChange={e => onFormDataChange({ ...formData, companionName: e.target.value })}
                    className="w-full h-8 text-sm"
                />
            </div>
            {/* 伙伴经验区块（右侧为图片+描述，无经验示例） */}
            {renderCompanionExperienceSection()}
            {/* Spellcast Roll Info */}
                    <p className="text-xs mb-4 text-gray-600 dark:text-gray-400 leading-snug">你可以进行一次施法检定来与你的伙伴建立连接并命令他们行动。当你这样做时，你可以花费希望将一个适用的伙伴经历加入到检定中。在花费希望并成功时，如果你的下一个动作建立在其成功之上，你的动作掷骰获得优势。</p>
            {/* 新的两栏布局：左-攻击与伤害/压力，右-训练 */}
            <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-x-5 mb-3">
                {/* 攻击与伤害/压力 - 左侧 */}
                <div className="order-1 md:order-1 print:order-1 space-y-3">
                    {/* Attack & Damage */}
                    <div>
                        <h4 className={sectionBannerClass}>攻击与伤害</h4>
                        <div className="p-1.5 border border-gray-300 dark:border-gray-700 border-t-0 rounded-b-lg space-y-1">
                            <div>
                                <label htmlFor="companionWeapon" className="block text-xs font-medium text-gray-600 dark:text-gray-400">攻击方式与范围</label>
                                <Input
                                    type="text"
                                    id="companionWeapon"
                                    name="companionWeapon"
                                    value={safeFormData.companionWeapon || ''}
                                    onChange={e => onFormDataChange({ ...formData, companionWeapon: e.target.value })}
                                    className="w-full h-7 text-xs"
                                    placeholder="爪击/近战"
                                />
                            </div>
                            <div>
                                <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">伤害骰</span>
                                {renderAttackDice()}
                            </div>
                            <p className="text-2xs text-gray-600 dark:text-gray-400 leading-snug">如果你命令你的伙伴攻击，他们会获得通常适用于你的增益（例如游侠的“专注”效果）。成功时，他们的伤害掷骰使用你的熟练度和他们的伤害骰。</p>
                        </div>
                    </div>
                    {/* Stress */}
                    <div>
                        <h4 className={sectionBannerClass}>压力</h4>
                        <div className="p-1.5 border border-gray-300 dark:border-gray-700 border-t-0 rounded-b-lg">
                            <div className="flex items-center mb-1 gap-2">
                                <span className="text-xs mr-1 font-semibold text-gray-700 dark:text-gray-300">压力：</span>
                                {renderStressBoxes()}
                                <span className="text-xs text-gray-500 ml-2">最大</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={TOTAL_STRESS}
                                    name="companionStressMax"
                                    value={safeFormData.companionStressMax || 3}
                                    onChange={e => onFormDataChange({ ...formData, companionStressMax: Number(e.target.value) })}
                                    className="w-10 text-center border-b border-gray-400 bg-transparent focus:outline-none text-xs font-bold print-empty-hide"
                                    style={{ width: '2.5rem' }}
                                />
                            </div>
                                    <p className="text-2xs text-gray-600 dark:text-gray-400 mb-1 leading-snug">每当你的伙伴将要受到伤害时，他们标记一点压力。当他们的压力槽满时，他们会脱离场景（躲藏、逃跑等）。动物伙伴暂时不可用，它将在下一次长休时返回，并清除一点压力。</p>
                            <p className="text-2xs text-gray-600 dark:text-gray-400 mb-1 leading-snug">每当你对自己使用“清除压力”的休整动作时，也会自动为你的伙伴清除同样多的压力。</p>
                        </div>
                    </div>
                </div>
                {/* Training - 右侧 */}
                <div className="order-2 md:order-2 print:order-2 mt-4 md:mt-0 print:mt-0">
                    <div>
                        <h4 className={sectionBannerClass}>训练</h4>
                        <div className="p-2 border border-gray-300 dark:border-gray-700 border-t-0 rounded-b-lg">
                            <p className="text-xs mb-2 text-gray-600 dark:text-gray-400">每当你的角色升级时，也从下面的列表中为你的伙伴选择一个选项并标记它。</p>
                            <div className="space-y-1">
                                {renderTrainingOption("聪慧：一项经历获得 +1。", "intelligent", 3)}
                                {renderTrainingOption("黑暗中的光芒：你的角色获得额外一个希望槽。", "radiantInDarkness", 1)}
                                {renderTrainingOption("生物慰藉：每次短休一次，当你花时间在一个安静的时刻给予你的伙伴爱和关注时，你们都可以清除一点压力或获得一点希望。", "creatureComfort", 1)}
                                {renderTrainingOption("装甲：当你的伙伴受到伤害时，你可以自己标记一格护甲槽代替伙伴标记一点压力。", "armored", 1)}
                                {renderTrainingOption("凶猛：增加你伙伴的伤害骰（如d6到d8）或范围（如近战到临近）一个等级。", "vicious", 3)}
                                {renderTrainingOption("坚韧：增加一个额外的压力槽。", "resilient", 3)}
                                        {renderTrainingOption("羁绊：当你标记最后一个生命槽时，你的伙伴会冲到你身边安慰你。掷出等同于他们可用压力槽数量的d6，并标记这些压力。如果掷出6，他们会让你振作起来。清除你的最后一个生命槽并返回场景。", "bonded", 1)}
                                {renderTrainingOption("警觉：伙伴的闪避+2。", "aware", 3)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
                </div>
            </div>
        </>
    );
};

export default CharacterSheetPageThree;