import { join } from 'path';
import { createBot, createProvider, createFlow, addKeyword, utils } from '@builderbot/bot';
import { MemoryDB as Database } from '@builderbot/bot';
import { BaileysProvider as Provider } from '@builderbot/provider-baileys';
import { buscarProductoEnSupermercado } from './scraper'; 

const PORT = process.env.PORT ?? 3000;
const products = [
    {
        name: 'Arroz',
        brand: 'Ala',
        price: '$1500',
        weight: '500gr',
        image: 'https://ardiaprod.vtexassets.com/arquivos/ids/332876/Arroz-Largo-Fino-Molinos-Ala-500-Gr-_2.jpg?v=638619044247030000',
    },
    {
        name: 'Arroz',
        brand: 'Dos Hermanos',
        price: '$900',
        weight: '1000gr',
        image: 'https://statics.dinoonline.com.ar/imagenes/full_600x600_ma/2290318_f.jpg'
    },
    {
        name: 'Arroz',
        brand: 'Apostoles',
        price: '$1300',
        weight: '1000gr',
        image: 'https://www.golomax.com.ar/uploads/centum/articles/home/13018042_1.jpg',
    },
];

const welcomeFlow = addKeyword<Provider, Database>(['hola', 'buen dia', 'hello'])
    .addAnswer(`🙌 Bienvenido a coto-bot!`)
    .addAnswer(['¿En qué puedo ayudarte?'])
    .addAnswer(
        ['1. Buscar', '2. Ofertas', '3. Atención al cliente'],
        { capture: true },
        async (ctx, { gotoFlow, flowDynamic }) => {
            const choice = ctx.body.toLowerCase();

            if (choice === '1' || choice.includes('buscar')) {
                return gotoFlow(searchProduct);
            } else if (choice === '2' || choice.includes('ofertas')) {
                await ctx.reply("🔥 Aquí puedes ver nuestras ofertas.");
            } else if (choice === '3' || choice.includes('atención al cliente')) {
                await ctx.reply("📞 Has elegido atención al cliente. ¿Cómo puedo ayudarte?");
            } else {
                await flowDynamic("😢 Disculpa, debes elegir una de las opciones: 1. Buscar, 2. Ofertas, o 3. Atención al cliente.");
                return gotoFlow(welcomeFlow);
            }
        }
    );

const searchProduct = addKeyword<Provider, Database>(['busco', 'quiero', 'necesito'])
    .addAnswer("Escribe el nombre del producto:", { capture: true }, async (ctx, { flowDynamic, gotoFlow }) => {
        const productName = ctx.body.toLowerCase();
        const matchingProducts = products.filter(p => p.name.toLowerCase() === productName);

        if (matchingProducts.length > 0) {
            // Mostrar los productos locales encontrados
            await flowDynamic(matchingProducts.map(product => ({
                body: `🛒 Producto Local Encontrado:\nNombre: ${product.name}\nMarca: ${product.brand}\nPrecio: ${product.price}\nPeso: ${product.weight}`,
                media: product.image,
            })));

            // Recomendar el producto más barato
            const cheapestProduct = matchingProducts.reduce((prev, curr) => {
                const prevPrice = parseFloat(prev.price.replace('$', '').replace(',', ''));
                const currPrice = parseFloat(curr.price.replace('$', '').replace(',', ''));
                return (prevPrice < currPrice) ? prev : curr;
            });

            await flowDynamic([{
                body: `💡 Te recomendamos basado en la calidad precio:\nNombre: ${cheapestProduct.name}\nMarca: ${cheapestProduct.brand}\nPrecio: ${cheapestProduct.price}\nPeso: ${cheapestProduct.weight}`,
                media: cheapestProduct.image,
            }]);
        } else {
            // Buscar en el supermercado online si no está en la lista local
            const scrapedProducts = await buscarProductoEnSupermercado(productName)

            if (scrapedProducts && scrapedProducts.length > 0) {
                await flowDynamic(scrapedProducts.map(product => ({
                    body: `🔍 Producto Encontrado:\nNombre: ${product.nombre}\nMarca: ${product.marca}\nPrecio: ${product.precio}\nPrecio por kg: ${product.peso}`,
                    media: product.imagen,
                })));

                // Borra la información después de enviarla
                scrapedProducts.length = 0; // Borra el contenido
            } else {
                await flowDynamic(`😢 Disculpa, no encontramos el producto: ${productName}`);
                return gotoFlow(searchProduct);
            }
        }

        // Mensaje para reiniciar la búsqueda
        await flowDynamic(`🔄 Para comenzar otra búsqueda, vuelve a poner "hola".`);
    });

const main = async () => {
    const adapterFlow = createFlow([welcomeFlow, searchProduct]);
    const adapterProvider = createProvider(Provider);
    const adapterDB = new Database();

    const { httpServer } = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    });

    httpServer(+PORT);
};

main();
