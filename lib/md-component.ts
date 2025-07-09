import React from "react";

// [input:10] -> <code data-type="input" data-value="10"></code>
// [box:2] -> <code data-type="box" data-value="2"></code>
// [checkbox] -> <code data-type="checkbox"></code>
// [checkbox:3] -> <code data-type="checkbox" data-value="3"></code>
// [center]内容[/center] -> <div class="text-center">内容</div>

export function transformCustomSyntax(text: string): string {
    let transformedText = text;

    // 处理 [center]...[/center]
    transformedText = transformedText.replace(
        /\[center\]([\s\S]*?)\[\/center\]/g,
        '<div class="text-center">$1</div>'
    );

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
