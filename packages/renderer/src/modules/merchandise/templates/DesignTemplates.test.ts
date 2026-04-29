import { describe, it, expect, beforeEach } from 'vitest';
import { TemplateService, INDIE_ARTIST_TEMPLATES } from './DesignTemplates';
import type { DesignTemplate } from './DesignTemplates';

describe('TemplateService', () => {
    let templateService: TemplateService;

    beforeEach(() => {
        templateService = new TemplateService();
    });

    it('getAll should return all available templates', () => {
        const templates = templateService.getAll();
        expect(templates.length).toBe(INDIE_ARTIST_TEMPLATES.length);
        expect(templates[0]?.id).toBe(INDIE_ARTIST_TEMPLATES[0]?.id);
    });

    it('getByCategory should filter templates by category', () => {
        const albumArtTemplates = templateService.getByCategory('album-art');
        expect(albumArtTemplates.length).toBeGreaterThan(0);
        albumArtTemplates.forEach(t => {
            expect(t.category).toBe('album-art');
        });
    });

    it('search should match queries case-insensitively', () => {
        const query = 'minimal';
        const results = templateService.search(query);
        expect(results.length).toBeGreaterThan(0);
        results.forEach(t => {
            const matchesName = t.name.toLowerCase().includes(query);
            const matchesDesc = t.description.toLowerCase().includes(query);
            const matchesTags = t.tags.some(tag => tag.toLowerCase().includes(query));
            expect(matchesName || matchesDesc || matchesTags).toBe(true);
        });
    });

    it('getById should return the correct template or undefined', () => {
        const validId = INDIE_ARTIST_TEMPLATES[0]?.id as string;
        const template = templateService.getById(validId);
        expect(template).toBeDefined();
        expect(template?.id).toBe(validId);

        const invalidTemplate = templateService.getById('non-existent-id');
        expect(invalidTemplate).toBeUndefined();
    });

    it('getForProduct should filter templates by recommended product', () => {
        // Find a product type that exists in our templates
        const templateWithProduct = INDIE_ARTIST_TEMPLATES.find(t => t.recommendedProducts && t.recommendedProducts.length > 0);
        if (templateWithProduct && templateWithProduct.recommendedProducts) {
            const productType = templateWithProduct.recommendedProducts[0];
            const results = templateService.getForProduct(productType!);
            expect(results.length).toBeGreaterThan(0);
            results.forEach(t => {
                expect(t.recommendedProducts?.some(p => p.toLowerCase() === productType!.toLowerCase())).toBe(true);
            });
        }
    });

    it('getCategories should return correct counts for each category', () => {
        const categories = templateService.getCategories();
        expect(categories.length).toBeGreaterThan(0);

        // Let's verify album-art category
        const albumArtCount = INDIE_ARTIST_TEMPLATES.filter(t => t.category === 'album-art').length;
        const categoryResult = categories.find(c => c.category === 'album-art');
        if (albumArtCount > 0) {
            expect(categoryResult).toBeDefined();
            expect(categoryResult?.count).toBe(albumArtCount);
        }
    });

    it('addTemplate should add a new template', () => {
        const initialCount = templateService.getAll().length;
        const newTemplate = {
            id: 'custom-template',
            name: 'Custom Template',
            description: 'A custom template',
            category: 'merch-graphic' as const,
            tags: ['custom'],
            canvasWidth: 1000,
            canvasHeight: 1000,
            backgroundColor: '#ffffff',
            elements: [],
            isPro: false
        } as unknown as DesignTemplate;

        templateService.addTemplate(newTemplate);
        const templates = templateService.getAll();

        expect(templates.length).toBe(initialCount + 1);
        expect(templateService.getById('custom-template')).toBeDefined();
    });

    it('toFabricObjects should correctly map elements', () => {
        const testTemplate = {
            id: 'fabric-test',
            name: 'Fabric Test',
            description: 'Test template for toFabricObjects',
            category: 'merch-graphic' as const,
            tags: [],
            canvasWidth: 1000,
            canvasHeight: 1000,
            backgroundColor: '#ffffff',
            elements: [
                {
                    id: 'text-1',
                    type: 'text' as const,
                    name: 'Test Text',
                    x: 10, // 10%
                    y: 20, // 20%
                    width: 50, // 50%
                    height: 10, // 10%
                    content: 'Hello World',
                    fontFamily: 'Arial',
                    fontSize: 24,
                    fontWeight: 'bold',
                    textAlign: 'center' as const,
                    fill: '#ff0000',
                    zIndex: 1,
                    editable: true,
                    opacity: 1,
                    angle: 0,
                    locked: false
                },
                {
                    id: 'shape-1',
                    type: 'shape' as const,
                    name: 'Test Shape',
                    x: 50,
                    y: 50,
                    width: 20,
                    height: 20,
                    fill: '#00ff00',
                    zIndex: 2,
                    editable: false,
                    opacity: 1,
                    angle: 0,
                    locked: true
                },
                {
                    id: 'placeholder-1',
                    type: 'placeholder' as const,
                    name: 'Test Placeholder',
                    x: 10,
                    y: 80,
                    width: 30,
                    height: 30,
                    fill: '#0000ff',
                    placeholder: true,
                    zIndex: 3,
                    editable: true,
                    opacity: 1,
                    angle: 0,
                    locked: false
                },
                {
                    id: 'image-1',
                    type: 'image' as const,
                    name: 'Test Image',
                    x: 60,
                    y: 80,
                    width: 30,
                    height: 30,
                    fill: '#0000ff',
                    placeholder: true,
                    zIndex: 4,
                    editable: true,
                    opacity: 1,
                    angle: 0,
                    locked: false
                }
            ],
            isPro: false
        } as unknown as DesignTemplate;

        const fabricObjects = templateService.toFabricObjects(testTemplate);

        // Should map 4 elements
        expect(fabricObjects.length).toBe(4);

        // Text mapping test
        const textObj = fabricObjects[0];
        expect(textObj?.type).toBe('textbox');
        expect(textObj?.left).toBe(100); // 10% of 1000
        expect(textObj?.top).toBe(200); // 20% of 1000
        expect(textObj?.width).toBe(500); // 50% of 1000
        expect(textObj?.height).toBe(100); // 10% of 1000
        expect(textObj?.text).toBe('Hello World');
        expect(textObj?.fontFamily).toBe('Arial');
        expect(textObj?.selectable).toBe(true);
        expect(textObj?.evented).toBe(true);

        // Shape mapping test
        const shapeObj = fabricObjects[1];
        expect(shapeObj?.type).toBe('rect');
        expect(shapeObj?.left).toBe(500); // 50% of 1000
        expect(shapeObj?.top).toBe(500); // 50% of 1000
        expect(shapeObj?.fill).toBe('#00ff00');
        expect(shapeObj?.selectable).toBe(false);
        expect(shapeObj?.evented).toBe(false);

        // Placeholder mapping test
        const placeholderObj = fabricObjects[2];
        expect(placeholderObj?.type).toBe('rect');
        expect(placeholderObj?.isPlaceholder).toBe(true);
        expect(placeholderObj?.placeholderText).toBe('Drop image here');
        expect(placeholderObj?.stroke).toBe('#FFE135');

        // Image mapping test
        const imageObj = fabricObjects[3];
        expect(imageObj?.type).toBe('rect');
        expect(imageObj?.isPlaceholder).toBe(true);
        expect(imageObj?.placeholderText).toBe('Drop image here');
    });
});
