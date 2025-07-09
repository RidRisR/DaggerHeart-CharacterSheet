import React from "react";

// [input:10] -> <code data-type="input" data-value="10"></code>
// [input:10:key] -> <code data-type="input" data-value="10" data-key="key"></code>
// [box:2] -> <code data-type="box" data-value="2"></code>
// [box:2:key] -> <code data-type="box" data-value="2" data-key="key"></code>
// [checkbox] -> <code data-type="checkbox"></code>
// [checkbox:key] -> <code data-type="checkbox" data-key="key"></code>
// [checkbox:3] -> <code data-type="checkbox" data-value="3"></code>
// [checkbox:3:key] -> <code data-type="checkbox" data-value="3" data-key="key"></code> (key存储选中的个数)
// [center]内容[/center] -> <div class="text-center">内容</div>

export function transformCustomSyntax(text: string): string {
    let transformedText = text;

    // 处理 [center]...[/center]
    transformedText = transformedText.replace(
        /\[center\]([\s\S]*?)\[\/center\]/g,
        '<div class="text-center">$1</div>'
    );

    // 处理带唯一key的新格式
    // [input:size:key], [box:size:key]
    transformedText = transformedText.replace(
        /\[(input|box):(\d+):([a-zA-Z0-9_]+)\]/g,
        '<code data-type="$1" data-value="$2" data-key="$3"></code>'
    );

    // [checkbox:count:key] - 多个复选框，用key存储选中的个数
    transformedText = transformedText.replace(
        /\[(checkbox):(\d+):([a-zA-Z0-9_]+)\]/g,
        '<code data-type="$1" data-value="$2" data-key="$3"></code>'
    );

    // [checkbox:key] - 单个复选框
    transformedText = transformedText.replace(
        /\[(checkbox):([a-zA-Z0-9_]+)\]/g,
        '<code data-type="$1" data-key="$2"></code>'
    );

    // 为了向后兼容，保留旧格式（无key）
    // 处理 [input:size], [box:size], [checkbox], [checkbox:count]
    transformedText = transformedText.replace(
        /\[(input|box):(\d+)\]/g,
        '<code data-type="$1" data-value="$2"></code>'
    );
    transformedText = transformedText.replace(
        /\[(checkbox):(\d+)\]/g,
        '<code data-type="$1" data-value="$2"></code>'
    );
    transformedText = transformedText.replace(
        /\[(checkbox)\]/g,
        '<code data-type="$1"></code>'
    );

    return transformedText;
}
