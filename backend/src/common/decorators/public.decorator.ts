/**
 * Decorador @Public()
 * Marca un endpoint como público (sin autenticación)
 */

import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
