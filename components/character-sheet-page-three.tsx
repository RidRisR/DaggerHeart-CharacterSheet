import React from 'react';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface CharacterSheetPageThreeProps {
    formData: any;
    onFormDataChange: (data: any) => void;
    allCards?: any[];
}

const MAX_STRESS = (formData: any) => Number(formData.companionStressMax) || 3;
const TOTAL_STRESS = 6;

// 通用渲染小方格（与第一页一致）
const renderBox = (checked: boolean, dashed: boolean, onClick: () => void, key: string | number) => (
    <div
        key={key}
        className={`w-3 h-3 border ${dashed ? 'border-dashed border-gray-400' : 'border-2 border-gray-800'} rounded cursor-pointer flex items-center justify-center transition-colors duration-100 select-none ${checked ? 'bg-gray-800' : 'bg-white'} hover:border-blue-500 active:scale-95`}
        style={{ minWidth: '0.75rem', minHeight: '0.75rem' }}
        onClick={onClick}
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
        aria-pressed={checked}
        role="checkbox"
    >
        {checked && <div className="w-2 h-2 bg-white rounded" />}
    </div>
);

const CharacterSheetPageThree: React.FC<CharacterSheetPageThreeProps> = ({
    formData,
    onFormDataChange,
}) => {
    // 伙伴经验区块（右侧为图片+描述，无经验示例）
    const renderCompanionExperienceSection = () => (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-x-5 mb-3 print:grid-cols-5 print:gap-x-5 print:mb-3">
            <div className="md:col-span-3 print:col-span-3">
                <h3 className="font-bold text-md mb-1 text-gray-800 dark:text-gray-200">伙伴经验</h3>
                <p className="text-xs mb-1.5 text-gray-600 dark:text-gray-400">
                    初始两项经验各+2。每当你获得一个经验时，也给你的伙伴一个。
                </p>
                <div className="space-y-1 pr-2">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="flex items-center">
                            <Input
                                type="text"
                                id={`companionExperience${i}`}
                                name={`companionExperience${i}`}
                                value={formData[`companionExperience${i}`] || ''}
                                onChange={e => onFormDataChange({ ...formData, [`companionExperience${i}`]: e.target.value })}
                                className="flex-grow border-b border-gray-400 p-1 focus:outline-none text-sm print-empty-hide"
                                placeholder="经验描述"
                            />
                            <Input
                                type="text"
                                id={`companionExperienceValue${i}`}
                                name={`companionExperienceValue${i}`}
                                value={formData[`companionExperienceValue${i}`] || ''}
                                onChange={e => onFormDataChange({ ...formData, [`companionExperienceValue${i}`]: e.target.value })}
                                className="w-8 border border-gray-400 rounded ml-1 text-center text-sm print-empty-hide"
                                placeholder="#"
                            />
                        </div>
                    ))}
                </div>
            </div>
            <div className="md:col-span-2 mt-3 md:mt-0 flex flex-col items-center justify-start print:col-span-2 print:mt-0 print:items-center print:justify-start">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">伙伴图片（可选）</label>
                <div className="w-36 h-36 border-2 border-gray-800 flex items-center justify-center relative overflow-hidden bg-gray-100 dark:bg-gray-800 print:w-32 print:h-32">
                    {formData.companionImage ? (
                        <img
                            src={formData.companionImage}
                            alt="伙伴图片"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <svg viewBox="0 0 48 48" fill="none" className="w-16 h-16 text-gray-300" xmlns="http://www.w3.org/2000/svg">
                            <rect width="48" height="48" rx="8" fill="currentColor" />
                            <path d="M24 14a6 6 0 100 12 6 6 0 000-12zm0 16c-5.33 0-16 2.67-16 8v2h32v-2c0-5.33-10.67-8-16-8z" fill="#fff" />
                        </svg>
                    )}
                    <input
                        type="file"
                        accept="image/*"
                        onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                                const reader = new FileReader();
                                reader.onload = ev => {
                                    onFormDataChange({ ...formData, companionImage: ev.target?.result });
                                };
                                reader.readAsDataURL(file);
                            }
                        }}
                        className="opacity-0 absolute inset-0 cursor-pointer"
                        tabIndex={-1}
                    />
                </div>
                <div className="w-full mt-2 flex-1 flex flex-col justify-end print:mt-2">
                    <textarea
                        rows={5}
                        id="companionDescription"
                        name="companionDescription"
                        value={formData.companionDescription || ''}
                        onChange={e => onFormDataChange({ ...formData, companionDescription: e.target.value })}
                        className="block w-full text-xs border border-gray-300 dark:border-gray-700 rounded px-2 py-1 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 resize-none shadow-inner min-h-[4.5rem] max-h-[6.5rem] print:min-h-[3.5rem] print:max-h-[5rem]"
                        placeholder="伙伴描述（如性格、外貌等）"
                        maxLength={180}
                        style={{ minHeight: '4.5rem', maxHeight: '6.5rem' }}
                    />
                </div>
            </div>
        </div>
    );
    // 攻击骰选择 ToggleGroup（已与第一页一致）
    const renderAttackDice = () => (
        <ToggleGroup type="single" value={formData.companionRange || ''} onValueChange={val => onFormDataChange({ ...formData, companionRange: val })} className="flex space-x-2 mt-1">
            {['D6', 'D8', 'D10', 'D12'].map(r => (
                <ToggleGroupItem key={r} value={r} className="px-2 py-1 text-xs rounded border border-gray-400 data-[state=on]:bg-blue-600 data-[state=on]:text-white">
                    {r}
                </ToggleGroupItem>
            ))}
        </ToggleGroup>
    );

    // 训练区块复用升级区块风格，复选框风格与第一页一致
    const renderTrainingOption = (mainText: string, namePrefix: string, checkboxCount: number) => {
        const parts = mainText.split(/：|:/);
        const title = parts[0];
        const desc = parts.length > 1 ? parts.slice(1).join(':').trim() : '';
        // 兼容旧数据，确保是数组
        const arr = Array.isArray(formData[namePrefix]) ? formData[namePrefix].slice(0, checkboxCount) : Array(checkboxCount).fill(false);
        return (
            <div className="flex items-start gap-2 mb-1">
                <div className="flex gap-1">
                    {Array(checkboxCount).fill(0).map((_, i) => (
                        <div
                            key={`${namePrefix}-${i}`}
                            className={`w-4 h-4 border-2 border-gray-800 ${arr[i] ? "bg-gray-800" : "bg-white"} cursor-pointer flex items-center justify-center`}
                            onClick={() => {
                                const newArr = [...arr];
                                newArr[i] = !newArr[i];
                                onFormDataChange({ ...formData, [namePrefix]: newArr });
                            }}
                            tabIndex={0}
                            aria-checked={!!arr[i]}
                            role="checkbox"
                        />
                    ))}
                </div>
                <div className="flex-1 min-w-0 break-words text-wrap text-left">
                    <span className="text-[11px] text-gray-800 dark:text-gray-200 font-bold">{title}</span>
                    {desc && <span className="text-[10px] text-gray-600 dark:text-gray-300 ml-1 font-bold">{desc}</span>}
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
                value={formData.companionEvasion || ''}
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
        const stressArr = Array.isArray(formData.companionStress)
            ? formData.companionStress.slice(0, TOTAL_STRESS)
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

    const sectionBannerClass = "bg-gray-700 text-white font-bold py-1 px-3 text-center text-sm tracking-wider uppercase";

    return (
        <div className="p-5 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 print-friendly-page-three ranger-companion-sheet leading-normal">
            {/* Header Section - 黑色顶盖 */}
            <div className="bg-gray-800 text-white p-5 flex items-center rounded-t-md mb-3">
                <div className="flex flex-col">
                    <div className="text-[9px]">DAGGERHEART V20250520</div>
                </div>
            </div>
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
                    value={formData.companionName || ''}
                    onChange={e => onFormDataChange({ ...formData, companionName: e.target.value })}
                    className="w-full h-8 text-sm"
                />
            </div>
            {/* 伙伴经验区块（右侧为图片+描述，无经验示例） */}
            {renderCompanionExperienceSection()}
            {/* Spellcast Roll Info */}
            <p className="text-xs mb-4 text-gray-600 dark:text-gray-400 leading-snug">你可以进行一次施法检定来与你的伙伴建立连接并命令他们行动。当你这样做时，你可以花费希望（Hope）将一个适用的伙伴经验加入到检定中。在花费希望并成功时，如果你的下一个动作建立在其成功之上，你的动作掷骰获得优势。</p>
            {/* ATTACK & DAMAGE, STRESS (Left) & TRAINING (Right) */}
            <div className="grid grid-cols-1 md:grid-cols-5 print:grid-cols-5 gap-x-5 mb-3">
                <div className="md:col-span-3 print:col-span-3 space-y-4">
                    {/* Attack & Damage */}
                    <div>
                        <h4 className={sectionBannerClass}>攻击与伤害</h4>
                        <div className="p-2.5 border border-gray-300 dark:border-gray-700 border-t-0 space-y-2">
                            <div>
                                <label htmlFor="companionWeapon" className="block text-xs font-medium text-gray-600 dark:text-gray-400">攻击方式与范围</label>
                                <Input
                                    type="text"
                                    id="companionWeapon"
                                    name="companionWeapon"
                                    value={formData.companionWeapon || ''}
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
                        <div className="p-2.5 border border-gray-300 dark:border-gray-700 border-t-0">
                            <div className="flex items-center mb-1.5 gap-2">
                                <span className="text-xs mr-1.5 font-semibold text-gray-700 dark:text-gray-300">压力：</span>
                                {renderStressBoxes()}
                                <span className="text-xs text-gray-500 ml-2">最大</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={TOTAL_STRESS}
                                    name="companionStressMax"
                                    value={formData.companionStressMax || 3}
                                    onChange={e => onFormDataChange({ ...formData, companionStressMax: e.target.value })}
                                    className="w-10 text-center border-b border-gray-400 bg-transparent focus:outline-none text-xs font-bold print-empty-hide"
                                    style={{ width: '2.5rem' }}
                                />
                            </div>
                            <p className="text-2xs text-gray-600 dark:text-gray-400 mb-1 leading-snug">每当你的伙伴将要受到伤害时，他们标记一点压力。当他们的压力槽满时，他们会脱离场景（躲藏、逃跑等）。他们对你不可用，并将在你下一次长休时返回，并清除一点压力。</p>
                            <p className="text-2xs text-gray-600 dark:text-gray-400 mb-1 leading-snug">每当你对自己使用“清除压力”的休整动作时，也会自动为你的伙伴清除同样多的压力。</p>
                        </div>
                    </div>
                </div>
                <div className="md:col-span-2 print:col-span-2 mt-4 md:mt-0 print:mt-0">
                    {/* Training */}
                    <div>
                        <h4 className={sectionBannerClass}>训练</h4>
                        <div className="p-2.5 border border-gray-300 dark:border-gray-700 border-t-0">
                            <p className="text-xs mb-2 text-gray-600 dark:text-gray-400">每当你的角色升级时，也从下面的列表中为你的伙伴选择一个选项并标记它。</p>
                            <div className="space-y-1">
                                {renderTrainingOption("聪慧：一项经验+1。", "trainingIntelligent", 3)}
                                {renderTrainingOption("黑暗中的光芒：你的角色获得额外一个希望槽。", "trainingRadiantInDarkness", 1)}
                                {renderTrainingOption("生物慰藉：每次短休一次，当你花时间在一个安静的时刻给予你的伙伴爱和关注时，你们都可以清除一点压力或获得一点希望。", "trainingCreatureComfort", 1)}
                                {renderTrainingOption("装甲：当你的伙伴受到伤害时，你可以标记1护甲槽以代替其标记1压力点。", "trainingArmored", 1)}
                                {renderTrainingOption("凶猛：增加你伙伴的伤害骰（d6到d8等）或范围（近战到极近等）。", "trainingVicious", 3)}
                                {renderTrainingOption("坚韧：增加一个额外的压力槽。", "trainingResilient", 3)}
                                {renderTrainingOption("羁绊：当你标记最后一个生命点时，你的伙伴会冲到你身边安慰你。掷出等同于他们可用压力槽数量的d6，并标记这些压力。如果掷出6，他们会让你振作起来。清除你的最后一个生命点并返回场景。", "trainingBonded", 1)}
                                {renderTrainingOption("警觉：伙伴的闪避+2。", "trainingAware", 3)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Footer */}
            <p className="text-2xs text-center text-gray-500 dark:text-gray-400 pt-3 mt-4 border-t border-gray-200 dark:border-gray-700">© Daggerheart V20250520</p>
        </div>
    );
};

export default CharacterSheetPageThree;