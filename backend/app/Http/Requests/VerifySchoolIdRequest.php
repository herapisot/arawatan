<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates the School ID image upload request.
 *
 * Rules:
 * - id_image is required, must be an image (jpeg/png/jpg/webp), max 5 MB.
 */
class VerifySchoolIdRequest extends FormRequest
{
    /**
     * Any authenticated user may make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Validation rules for ID image upload.
     */
    public function rules(): array
    {
        return [
            'id_image' => ['required', 'image', 'mimes:jpeg,png,jpg,webp', 'max:5120'],
        ];
    }

    /**
     * Custom error messages.
     */
    public function messages(): array
    {
        return [
            'id_image.required'  => 'Please upload your School ID image.',
            'id_image.image'     => 'The file must be a valid image.',
            'id_image.mimes'     => 'Only JPEG, PNG, JPG, and WebP formats are accepted.',
            'id_image.max'       => 'The image must not exceed 5 MB.',
        ];
    }
}
