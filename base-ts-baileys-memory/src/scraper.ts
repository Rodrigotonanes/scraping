import { chromium } from 'playwright';

export async function buscarProductoEnSupermercado(producto: string) {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    await page.goto('https://diaonline.supermercadosdia.com.ar/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Cierra un posible pop-up si existe
    const closeButton = await page.$('.vtex-modal__close');
    if (closeButton) {
        await closeButton.click();
        await page.waitForTimeout(500);
    }

    // Espera a que el campo de búsqueda esté visible
    await page.waitForSelector('.vtex-store-components-3-x-searchBarContainer input', { timeout: 30000 });

    // Rellena el campo de búsqueda
    await page.fill('.vtex-store-components-3-x-searchBarContainer input', producto);
    await page.keyboard.press('Enter'); // Simula presionar "Enter"

    // Espera a que cargue la lista de productos
    await page.waitForSelector('.vtex-product-summary-2-x-imageNormal', { timeout: 30000 });

    const productsList = []; // Array para almacenar la información de los productos

    // Obtiene las tarjetas de producto después de la búsqueda
    let productCards = await page.$$('.vtex-product-summary-2-x-imageNormal');
    console.log('Número de tarjetas de producto encontradas:', productCards.length);

    // Itera sobre las primeras tres tarjetas de producto
    for (let i = 0; i < Math.min(3, productCards.length); i++) {
        const card = productCards[i];

        try {
            // Haz clic en la tarjeta de producto
            await card.click();
            console.log(`Haciendo clic en el producto ${i + 1}`);

            // Espera a que se cargue la página del producto
            await page.waitForTimeout(3000); // Aumenta el tiempo de espera si es necesario

            // Extrae detalles del producto
            const productInfo = await page.evaluate(() => {
                const imgElement = document.querySelector('.vtex-store-components-3-x-productImageTag--main') as HTMLImageElement;
                return {
                    nombre: document.querySelector('.vtex-store-components-3-x-productBrandName')?.textContent?.trim(),
                    precio: document.querySelector('.vtex-product-price-1-x-currencyContainer')?.textContent?.trim(),
                    marca: document.querySelector('.vtex-store-components-3-x-productBrand')?.textContent?.trim(),
                    peso: document.querySelector('[data-specification-name=PrecioPorUnd]')?.textContent?.trim(),
                    imagen: imgElement ? imgElement.src : null
                };
            });

            console.log(`Información del producto ${i + 1}:`, productInfo);
            productsList.push(productInfo); // Agrega la información del producto al array

            // Regresa a la página de búsqueda para poder repetir el proceso
            await page.goBack();
            await page.waitForTimeout(2000); // Espera un momento para que la página se recargue

            // Re-evaluar las tarjetas de producto
            await page.waitForSelector('.vtex-product-summary-2-x-imageNormal', { timeout: 30000 });
            productCards = await page.$$('.vtex-product-summary-2-x-imageNormal'); // Actualiza la referencia a las tarjetas
        } catch (error) {
            console.error(`Error al procesar el producto ${i + 1}:`, error);
            // Regresa a la página de búsqueda si hay un error
            await page.goBack();
            await page.waitForTimeout(2000);

            // Re-evaluar las tarjetas de producto
            await page.waitForSelector('.vtex-product-summary-2-x-imageNormal', { timeout: 30000 });
            productCards = await page.$$('.vtex-product-summary-2-x-imageNormal'); // Actualiza la referencia a las tarjetas
        }
    }

    await browser.close();
    console.log('Productos extraídos:', productsList);
    return productsList;
}
