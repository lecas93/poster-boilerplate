// const Recibo = require('receipt');
const Recibo = require('../recibo');

import { toFixedTrunc } from '../util/number_format';

export default class TicketPrinter {

    tipo = {
        VENTA: '-- VENTA --',
        CREDITO: '-- CRÉDITO --',
        ANTICIPO: '-- ANTICIPO --',
        ABONO: '-- ABONO --',
        PAGADO: '-- PAGADO --',
        INTERNA: '-- VENTA INTERNA --'
    };

    print(data) {
        console.log(data);
    }

    getSubtotalGrupo(grupo) {
        let subtotal = 0;
        for (let i in grupo.productos) {
            let producto = grupo.productos[i];
            let cantidad = parseInt(producto.cantidad);
            let p_unitario = parseFloat(producto.p_unitario);

            subtotal += Number((cantidad * p_unitario).toFixed(2));
        }

        return subtotal;
    }

    /**
     * 
     * @param {*} tipo El tipo de venta.
     * @param {*} product_list La lista de productos.
     * @param {*} data Los datos del ticket.
     * @param {Boolean} single_page Establecer **true** para imprimir solo una copia del ticket. **false** por defecto.
     * @param {Boolean} desglosado Indica si el ticket debe ser impreso en forma desglosada o no. **false** por defecto.
     */
    async printReceipt(tipo, product_list, data, single_page = false, spotId = Poster.settings.spotId, desglosado = false) {
        Recibo.config.currency = '$'; // The currency symbol to use in output.
        Recibo.config.width = 40;   // The amount of characters used to give the output a "width".
        Recibo.config.ruler = '=';

        let spot_id = parseInt(spotId);

        let tipo_transaccion = tipo;
        let t_impreso = '';
        let sucursal = '';
        let sucursal_dir = '';
        let sucursal_email = '';

        let importe_total = Number(data.abono) + Number(data.importe);
        let saldo = Number((data.total - importe_total).toFixed(2));

        let detalles = "";
        if (data.detalles !== null && data.detalles !== undefined) {
            detalles = data.detalles;
        }

        switch (spot_id) {
            case 1:
                sucursal = "Terranorte";
                sucursal_dir = 'direccion';
                sucursal_email = 'email';
                break;
            case 2:
                sucursal = "Caucel";
                sucursal_dir = 'direccion';
                sucursal_email = 'email';
                break;
            case 5:
                sucursal = "Matriz";
                sucursal_dir = 'direccion';
                sucursal_email = 'email';
                break;
            default:
        }

        switch (tipo) {
            case this.tipo.ABONO:
                t_impreso = 'Abono';
                if (saldo <= 0) tipo_transaccion = this.tipo.PAGADO;
                break;
            case this.tipo.PAGADO:
                t_impreso = 'Pagado';
                break;
            default:
                t_impreso = 'Impreso';
        }

        let descuento_cliente = data.descuento_cliente ? data.descuento_cliente : 0;

        let productos = [];
        if (data.json) { // si existe el formato json del ticket, imprimir usando nuevo metodo
            let productos_obj = JSON.parse(data.json);
            console.log('productos_obj', productos_obj);

            if (!desglosado) {
                // procesamos productos agrupados
                for (let nombre_grupo in productos_obj.prods_agrupados) {
                    let grupo = productos_obj.prods_agrupados[nombre_grupo];
                    let subtotal_grupo = this.getSubtotalGrupo(grupo);
                    productos.push({
                        item: " " + nombre_grupo,
                        qty: grupo.cant,
                        cost: toFixedTrunc((subtotal_grupo / grupo.cant) * 100, 2),
                        discount: { type: 'percentage', value: parseInt(descuento_cliente) / 100 }
                    });
                }

                // procesamos productos no agrupados
                for (let i in productos_obj.prods_no_agrupados) {
                    let producto = productos_obj.prods_no_agrupados[i];
                    let cantidad = parseInt(producto.cantidad);
                    let p_unitario = parseFloat(producto.p_unitario);

                    productos.push({
                        item: " " + producto.descript,
                        qty: cantidad,
                        cost: toFixedTrunc(p_unitario * 100, 2),
                        discount: { type: 'percentage', value: parseInt(descuento_cliente) / 100 }
                    });
                }
            } else {
                // procesamos productos agrupados
                for (let nombre_grupo in productos_obj.prods_agrupados) {
                    let grupo = productos_obj.prods_agrupados[nombre_grupo];
                    let subtotal_grupo = this.getSubtotalGrupo(grupo);

                    // agregamos el nombre del grupo como separador
                    productos.push({
                        item: " " + nombre_grupo,
                        qty: grupo.cant,
                        cost: toFixedTrunc((subtotal_grupo / grupo.cant) * 100, 2),
                        discount: { type: 'percentage', value: parseInt(descuento_cliente) / 100 }
                    });

                    // agregamos el producto
                    for (let i in grupo.productos) {
                        let producto = grupo.productos[i];
                        let cantidad = parseInt(producto.cantidad);
                        let p_unitario = parseFloat(producto.p_unitario);

                        productos.push({
                            item: " *" + producto.descript,
                            qty: cantidad,
                            cost: toFixedTrunc(p_unitario * 100, 2),
                            discount: { type: 'percentage', value: parseInt(descuento_cliente) / 100 }
                        });
                    }
                }

                // procesamos productos no agrupados
                for (let i in productos_obj.prods_no_agrupados) {
                    let producto = productos_obj.prods_no_agrupados[i];
                    let cantidad = parseInt(producto.cantidad);
                    let p_unitario = parseFloat(producto.p_unitario);

                    productos.push({
                        item: " " + producto.descript,
                        qty: cantidad,
                        cost: toFixedTrunc(p_unitario * 100, 2),
                        discount: { type: 'percentage', value: parseInt(descuento_cliente) / 100 }
                    });
                }
            }
        } else { // sino imprimir con metodo antiguo
            for (let i = 0; i < product_list.length; i++) {
                productos.push({
                    item: product_list[i].product_name + " " + (product_list[i].modificator_name !== null ? product_list[i].modificator_name : ""),
                    qty: toFixedTrunc(Number(product_list[i].num), 0),
                    cost: toFixedTrunc(Number(product_list[i].product_sum) / Number(product_list[i].num), 2),
                    discount: { type: 'percentage', value: (product_list[i].discount !== '0' ? (Number(product_list[i].discount) / 100) : 0) }
                });
            }
        }

        let ventaEspecial = [
            { name: 'Efectivo', value: '$' + toFixedTrunc(data.cash, 2) },
            { name: 'Tarjeta', value: '$' + toFixedTrunc(data.card, 2) },
            { name: 'Transferencia', value: '$' + toFixedTrunc(data.transfer, 2) },
            { name: '', value: '' },
            { name: 'Importe', value: '$' + toFixedTrunc(data.abono, 2) },
            { name: 'Pagos anteriores', value: '$' + toFixedTrunc(data.importe, 2) },
            { name: 'Importe total', value: '$' + toFixedTrunc(importe_total, 2) },
            { name: 'Saldo', value: '$' + toFixedTrunc(saldo, 2) },
        ];

        let ventaNormal = [
            { name: 'Efectivo', value: '$' + toFixedTrunc(data.cash, 2) },
            { name: 'Tarjeta', value: '$' + toFixedTrunc(data.card, 2) },
            { name: 'Transferencia', value: '$' + toFixedTrunc(data.transfer, 2) },
            { name: 'Cambio', value: '$' + toFixedTrunc(data.change, 2) },
        ];

        let headerTicket = [
            { name: 'Ticket', value: data.ticket },
            { name: 'Asesor', value: data.asesor },
            { name: 'Cliente', value: data.cliente },
            { name: 'Venta', value: data.fecha_venta },
            { name: t_impreso, value: data.fecha_abono },
            { name: 'Entrega el', value: data.fecha_entrega }
        ];

        let data_to_print = ventaNormal;
        switch (tipo_transaccion) {
            case this.tipo.VENTA:
                data_to_print = ventaNormal;
                break;
            case this.tipo.INTERNA:
                data_to_print = ventaNormal;
                break;
            default:
                data_to_print = ventaEspecial;
        }

        const output = Recibo.create([
            {
                type: 'text', value: [
                    'Empresa',
                    sucursal
                ], align: 'center'
            },
            { type: 'empty' },
            { type: 'text', value: tipo_transaccion, align: 'center', padding: 0 },
            { type: 'empty' },
            {
                type: 'properties', lines: headerTicket
            },
            {
                type: 'table', lines: productos
                /*
                type: 'table', lines: [
                    { item: 'Product 1', qty: 1, cost: 1000 },
                    { item: 'Product 2 with a really long name', qty: 1, cost: 17500, discount: { type: 'absolute', value: 1000 } },
                    { item: 'Another product wth quite a name', qty: 2, cost: 900 },
                    { item: 'Product 4', qty: 1, cost: 80, discount: { type: 'percentage', value: 0.15 } },
                    { item: 'This length is ridiculously lengthy', qty: 14, cost: 8516 },
                    { item: 'Product 6', qty: 3, cost: 500 },
                    { item: 'Product 7', qty: 3, cost: 500, discount: { type: 'absolute', value: 500, message: '3 for the price of 2' } }
                ]
                */
            },
            { type: 'empty' },
            { type: 'text', value: detalles, align: 'left' },
            { type: 'empty' },
            {
                type: 'properties', lines: [
                    { name: 'Total', value: '$' + toFixedTrunc(data.total, 2) }
                ]
            },
            { type: 'empty' },
            { type: 'text', value: '<b>Su pago</b>', align: 'left' },
            {
                type: 'properties', lines: data_to_print
            },
            /*
            { type: 'empty' },
            { type: 'text', value: '<b>Pago:</b>', align: 'left' },
            {
                type: 'properties', lines: [
                    { name: 'Efectivo', value: 'AUD XX.XX' },
                    { name: 'Cambio', value: 'AUD XX.XX' }
                ]
            },
            */
            { type: 'empty' },
            { type: 'text', value: sucursal_dir, align: 'left', padding: 0 },
            { type: 'empty' },
            { type: 'text', value: '* Este ticket <b>NO ES UN COMPROBANTE FISCAL.</b>', align: 'left', padding: 0 },
            { type: 'empty' },
            { type: 'text', value: '* Es obligación de nuestro personal darte una remisión o una factura impresa al término de la compra. Exígela.', align: 'left', padding: 0 },
            { type: 'empty' },
            { type: 'text', value: '* Si requiere factura, deberá solicitarla al momento de la compra, ya que esta venta se incluye en la factura global del día.', align: 'left', padding: 0 },
            { type: 'empty' },
            { type: 'text', value: '* ¿Dudas, quejas o sugerencias? Escribenos a: <b>email</b>', align: 'left', padding: 0 },
            { type: 'empty' },
            { type: 'text', value: '* Para pedidos por favor escribenos a: <b>' + sucursal_email + '</b>', align: 'left', padding: 0 }
        ]);

        let img64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIYAAABWCAIAAACFJXnpAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAABONSURBVHhe7ZwJdFRVmsff9IxzPL3M9HJ6OXOmzUIQRRAFBBrQsBN2kH3RsVFsFB1B7XahpR1RoFG2sAkosgqEoGEJgUTCJiCEAIEAJkBC2JOQkLX2qje/qu/l8VKpxBCjVcXJ/9xT597vfe++d7//vff7vlevSlGDHNdNjt7HrKmFNq0d/AhuSs6V2B/YbVZ2q7/Zadqff5ewEsSUnCq2hySVKztdSmyBst36s3hTwnWrdiyYEayUHC6w/X5HmbLD4eZjU6H7c5v1pzssX14NelaCkpI9edbfJlqUBLvGhxQ3K+Z/T7Csu2TR9IITwUcJu9PPd1jc+9WXxUpcSaWCZLtNSbAtyTJr2kGIIKNk+3XbfySYlC1l93xRcM8Xhb5KwU82F//LVtPirGBdK0FGyaVy5zmTerHcWXO5YFLPlzm1c4INwere72I0UBJwCERKssudo1PNo1PKRx8pq66MSjENOmpPvGHXzlFVx6l808j48hHxxaO3lVRfHKMTbYeva+cEJAKRksOFDiVZVZJUJbGa8pWqHFRHHCkvtLq0c4DFYZrytaospTiUhc5qiqp8Zll7RjslIBGIlKTeciibS5Uvim7nHMZCsLvD9fopk6ZdGeYlaSU/mVuizMlTPsz3VezKAsvGDE07IBFclBS45TvVKadrSjvMq9NL75lXpszzyUoDJXVBNZTAR5kSb51+tlzTqx6WDWdKf7ag3BcrDZTUBT4oifXwsd06J9P3flUVli3ni38abarCSgMldYE3JfCx1aRsNS/NvrOE3JKYXfzLhWYl2shKAyV1QSVKPA8T/3Vr+aqcujwgse67VPr7JRYDKw2U1BaXL19OT0+X+m1K3HxY7t1ujr1c9wdW1pRrpf+11KrMF1aMlNjPFtiO35B64CAgKMnLy+vVs+fSJUukqVGy6ZYSb/t5gvn7fzFlO5FbFLoMMrwoscadK//tJ7YTgcWK/ynJy83tFRXVuFGj9evXi8RNiTv5cPx6pzkpt36+vrWfvVl8/3L4MFJi232JvLLkN4tth66KJBDgZ0qys7J6dOsWHhpK0Sk5BiVJ6q8Syg/evP285PvDkVNc2nyVO3vXKUm+ZFLmsqeV/XKxdVeOCP0Of1KSmZnZOTISMkLvu89IyZ48+x+STD/ESyeOqyWmh9aal52UpoeSeexmJiXa9IvFlm0XRO5f+I2S06dPt2vbVvjwoiSn3HmqqD7XhxH27FuOMwVSF0puKh/lKTPJK833LjTHfiuH/Ag/UOJ0Og8cONChffvwkBDhw4uSHw06JSwU4rEyZW6xMse8JE21OjQNf8APlFjM5kEDB0aEh+t8BAIllFxlpqosITZzXinVNPwB/2xc586d69G9u75rBQIlrBKnsoiozJFRqB32E/zmS3IuXuzft6/OipGSoqKikpISqdc/XCbVlStVgy/50KUsKm/5ufOaP9eHwG+UgBvXrw/s319YMVLyzaFDyAsKNCdcr7Cr5h6q7VNp6JSoyiJT+w2O3O9+xvwjwJ+UAPL2oYMHw4eRkvT09EZhYb2joq5duyaSekK5aunjHrItRtpQYlbmqcrHZV02Ogpq+4z5h4afKQH5+flPjxnTODx83bp1Ijl16lRYSEij0NBePXrk5NRTBue8pZo6ecYLJRtFZiM9VJaXRMU6SwPotVX/UwKKi4oGDRiw/FNtPxFK2M1gpWunThfOnxd53eG8odo6ugdbXIkS6+ZzZb3jVHtgvfEVEJQAdrCsC1ryrFMiPuZP7dqdPXtWDtUFjquqpZXGR2VKXEUWl82fKYhPBAolRhgpcbMSEvJoixapqana4TuCI0s1P+AeZpEPSgITQUCJm5XQUFgh59c0agnHadUUWomPBkrqhqqUuFkJCXm4WbPk5GRN6TthP6ra/+jNRwMldYNPSiiw0iQiIiEhQdOrAfZDqu0PPvhooKRuqI4SCnI2sU2bNmmqPmFPVi3/qTp98UFpoKQOqIESipuVkJC1a9Zo2l6wbVPN96r2avigNFBSB6SlpZGRYHefBUo4Sno/Pzra4agcwlqXe0akuClxVFPclGg5aWAiECk5f/78wP79KeSP1ZX+/fp169Jlt9HbO/AfD6vmxmpp05qK2lS179ROCUgEIiW1h9VqfBBiIU3XqsGM4KbkrkRwUWJ32ZNU2wbVtkW1V1tc1s0u2xqXfb92UrAhuChxumwxaum/uW+7vJpSxoio/M5lP6idFGwIwo3L9oVa/gv3nZd6CDAWJMhNYarzezym9DeCkBJgS1BNv3JHtFVzDktz1XFJUwtOBCclwL7HZf6d6jKkhIzF3kZ1XNEUghZBSwmw73dZ/uhmpcTDh7mj6szTDgUzgpkSVXXZU1TTf7tHYemuun6wl1p+XAQ3JW7Yj6q2V1VXEP+PjReCn5K7Dg2UBBwaKAk4KEW3bnk/4q6MsrIyi8ViMpmoaKIKIPESOp1OJOhr7cooLysrL/fxRqFPoc1moyu73cevGhx2u+fKPqBpGMDoykpLtcOVoWkY4HK5tGOVoT/fNJvNNKVeFQxE9AGaSOjwtqh6yOkCpUe3boMHDcrP8x0+Xrx48bFWrf7v3XfHPvNMVI8eXEDku5OTRwwfHhEe3rhRo7ffeut0xS8/r1+/jj4SaRqBcTt36jR82DCtXYGjKSnt27WLjo7W2hVYuWJF28ce++bQIa1twL69e7lKq0cfrVqmTp36+eef6/cJUo4ceax169YtWxrVaLZp3Xr69OmbYmM1PQ9KS0p6du/updymVavoefNE4R/vvMOJX/j6WhPuB/TrJ+dye3997TWEt27derxjR68OqxbpQaAsW7oUs+6p5jUDjNsoLCw+Pj6qZ89HHn5Yhpp24kR4aCiXeX7cuKfHjEGhRfPmN/PzOXT58mWaL77wgufsSoCSpg880KVzZ61dgcmTJ3MDsKW1K7BwwQLke/fs0doGJCUmcpUwz9dZXoUb49DLEyboK/Xr/ftDPe+4eGlS5KswRqG/6VpSXMxYvJQjwsLef+89UXh10iSaKOgvAuqAknZt2si5dPvc2LEIb968ySh8Xt1YpAeBcuXyZc4ZPXKkJjCguLi4b+/eTFWs2b1bN2aHyJ9+6qnGERGZmZnSnPbBBx07dJC3FK5cucLl//fll+WQEXQCqT179NDaHpSWlj7SogUDaNK48Z7K1v948WJW4f59+7S2Abu++oqr6F/9Gr9wFAkdTnjxRWHl4IEDNPVDVHR9XfnZsWNlayouKnrowQeNnVMah4ezT3iurP719dfFvpy+YP58EQqg5ImOHeVC6Ix//nmEUEKTSxhvT4rxTqQHgdu9Dx08+OFmzQqrvKl+5PBh2JozezZ1ZrFOCftM61atpA7wHyxPqd8pJUuXLOGGhg4Z8mCTJi9NmKBJPaglJQ/cfz999oqKonTt3FkfNgopKSkoe1HCQESZondCZYdnSrHvjxoxolNkpMgprOy+vXp9+sknnitrlCB3GzQ0dMo77+ie2CclRUVFTw4c2NtzOXwEdyLdUmGH1O9EehC4KUlMTMT0n69dKyIdr06c2KxpU1kNRkqGDB6MsbZu2SJNI+6IEiTPPP00NmWtjBg2jBNv3Lj9E/TaUAKdfXr10n2vzWodNXKkdig09I2//Q0h3kinhM8zZ27/Gdebb7xBD6LMoDSpqh5LTdUtO+TJJzWpBzolUqizHLE7h3xSYgS7IvZEgfJoixZETNqBynBTkpOTE/n448OGDDF+b0rAg9vp9MQT0hRKxJdkZGTgSBjnooUL9fUhuCNKMjMy7m/UaOIrr1Bfs2YNBMyr8KKglpQwASW2EWBNMRbD/lPbtki++eYbIyWnT58WTaC/CkNvRkpSjx69La+REgoO6clBgxg4R2umhODWSIlXoKVDy0teHD+e4eGcpQnivvySPXRjjPZTDCMlIC0trW+fPjg6rPbWm2/qr1HfESVsiVAi2wu7X/euXVkrrBg5WjdKuGExCp8yn7woIYYUTTA/Olrk9IZZNaknSNPlhKOa1IOqlIhar549T6alMTr9xKqU4BqMlFT3SzONkiNHjnDfM//5T2kCthRij6ysLGl6UQJYdwnbtw8bOhRicInywm7tKSkoKCA2xatv27o1Li6Oz5HDh3OuHjXUfuPSd3P61N0Jk3fe3LkIDx08aKQEn7w5Lo7ywfvvy64lFlzx2WfSCag9JaLm1gwJwb82f+ghrfn9KeFw58hIphX7HU0sG3bffeOefVaOgqqU6Nize3fLRx5p2qQJSQkBBndTG0q+SkpCk4Ldpbjf3QoNfa8itqmleycu6N+v38ABAyj6vsEns+TUSfdfDni5d7moFF1CdHPt6u3/7KgNJSh0bN9+1kcfURFl/RJy4velBLCNMN8ZAHUyI8xhzAlqoATs37+fm3hn8uRbhYXMl9pQMmbUKCy1ZvVq7Ctl69atxPXMDPFPtaRExi9FNw0DEd8OqgbB7lJxLvXIJ544fvy4KAtqSYn4qlUrV4ZVXFov6NQDJVfZc7DmSy9R79a1KxkJEaEcAkKJ1NkfpKIDcxMsMlsLWCUhIeKxq4L7oGcqZDxsWV6eExAvEPvt3Ol+9a32lLgzPr14UhxiRfJwUfaihLyaIJ6r6OdOnzZNNHUcP3ZM9LlKde4dBTI2SX1iNmwQQ0ufcmI9UOJwOsc999zjHTps27aNHt+fOlU74AGUMIUJycjMcTOa1AA2CjwkOTyDfGH8eE1qAAEGOv369qW+5OOPMcqupCQ5pOP8uXPQgH+ijs53UiJ2YU0vXrRICkQeO3ZM0/PASAmfJ06cIJgk9dN68GQ28fHxooyJsRRbseijM6BfPySAAAQFL0r0QJaUgBHJWXJiPVACYmNjWfIMgHL5UqWXCqCEyUU4xPVYsLm52k/HBbhQbmLChAncIsuL3L7qT9kme57NyA9ECJMIuyVw9MLokSO5XeLylStXQsnX+328jqVTwors7+G4BnhRInkJmQT+T4R0RdYmBmKZEvrrXprCuWiyQ+ApUaiOEpCUlMRWofdZP5Sg1KF9e1hhtRojSwAl3AEzZfWqVVgKz3++4ledu5OTmSCMhDlOE7/NMPr16bNzxw5RYPzvv/ceZxFT0cPhw4dRkKdyVcEaJTLeHh8fu3Ejp0C2dsAAIyWw6/NBsg4vSshFRA7l0gmFlU1AjHDmjBkMX5T1ImoygWqgBOzdu1cekVHqhxIwceJE7Fs1k2/bpk2zBx+kwqqfNHEig7w/IoKIk8Ll4YOAWDTBpthYPB5j6+JRaNWypdAsS4d7xdbs16LsBdxMl8jIXlFRs2fNQo1hy1Uo3bp0GTRwIDrJu3ZxiOvSLVFidTmXgK0PE3DD6PPJxiVyq832P089JXIp7HjuZ52eno1FGJWkjchFLo2wedOmVWcDaRCrik6qbu/iaDmR0iQigpFqByrDm5LU1FTmcl6VZ/XPjxv31JgxesR14Ouvx4wejTk6RUYSaHntciA9PZ155w6sIyOHDhmCEUXO8h/75z+/OmmSvfovacg9Bw0YQHzJUoMJIiIpdMXOzjrL+PZbXBrWmfDCC+RSxocOVXE6PX30qFHDhw0bMXw4XkrPtEBmRgZJO3KGPKB/f/JfJhaXHjlihLFwLmMnvucUfBUuEyGDwmX6vPTJkyfZTqdWPDzWwbIY+8wz3AMFt13d4vam5IeGOMkG1IAfm5J6AXER8UV+fn51a78GOHx9TekF/cEdu0LNjsoLhD/yCNIIh8MhaYP+lMELXpcISkrY/WbOnPnapEm1/zG8DJv8ad/evSLxAlSJDoYjVZTVfPXqVeO3OAh97lT6zMjIyGD3k7ouJFA6evQoFSKLogqymVV4Zam/+cYbUhEEJSUgJSVl5YoVVM55QIXgR7cXpt8cF7dl82bqmIn62rVrCRGxKQEhwqMpKThbKuIds7Oz8XYbY2K+9QQgqR4Lpp04sWH9ek7M8TypZF0SKxIQGv/WBbMS+27cuJHYms7xwbIguOjcOXNWrVgh/zYiscy+ffu4EFe8cOECWdfHixYlJSYi9/oSNlgpOXDggHythNXk+/PCwkI9rGRizpk9W4IrOMC4dpttzpw52EISnRnTp5+peEqPHWfNmsUSIeK4ceMGVp7y97+jv37dOkIDpjPKHCWYxu6ZmZn69/Bg7Zo15JVUWHycSOcnjh9nbX04c6bT4Yjftg1Goerdf/wDHUIek2chEpLk5+URwhHm0PR6/hSslDDjmGhUmGjYjt2GrIjFIUcB+wYxGxLWE8ESdqHJepKNa9nSpemnTsHixYsX8UkYnRXG/BVK3p0yBUqIvlCAkunTpuFd8BP0BitE53IJsHr1avm95PHjxzkKJdDPvsqEoB96YAFxaYm+2NPkMc+0Dz5g9uTl5sqWNf4vf+FTR7BSwvBkX8KUu3btmjFjhpdfiY2JgSoq7FcxMTGsA9nf2LL4hDBSUUiS/9LJzsoiI5k7ezYWhxhZf0xqtjKMezE7mybZD8YlhqY3mgLsHrNhwyfLltEtd4K3YOtjjbLFpaakLF60aPny5ajJHsudSGpJfoZkwfz5KND86MMP+dQRrJR4oWombJRgLP2bMR1MamPuTV1/UqkD43qFQz7hFWXB96pVqya98srkt9/Wn3F4gcWnez4v3CWU3E1ooCTg0EBJwKGBkoBDAyUBhwZKAg4NlAQYVPX/Ac1SpoeTOlZ/AAAAAElFTkSuQmCC";
        let iframe = document.createElement('iframe');
        iframe.name = 'iframe';
        iframe.style.position = "absolute";
        iframe.style.top = "-5000px";
        document.body.appendChild(iframe);
        let frameDoc = (iframe.contentWindow) ? iframe.contentWindow : (iframe.contentDocument.document) ? iframe.contentDocument.document : iframe.contentDocument;
        frameDoc.document.open();
        if (single_page) {
            frameDoc.document.write("<!DOCTYPE html><html><head><style>@page { size: auto;  margin: 0mm; } body {background-color:#FFFFFF; border: solid 0px black; margin: 0px;}</style></head><body><img style='margin-left: 75px;' src='" + img64 + "'><pre>" + output + "</pre></body></html>");
        } else {
            frameDoc.document.write("<!DOCTYPE html><html><head><style>@page { size: auto;  margin: 0mm; } body {background-color:#FFFFFF; border: solid 0px black; margin: 0px;}</style></head><body><img style='margin-left: 75px;' src='" + img64 + "'><pre>" + output + "</pre><br /><pre>========================================</pre><br /><img style='margin-left: 75px;' src='" + img64 + "'><pre>" + output + "</pre></body></html>");
        }
        frameDoc.document.close();

        await new Promise(resolve => {
            setTimeout(() => {
                window.frames['iframe'].focus();
                window.frames['iframe'].print();
                document.body.removeChild(iframe);
                resolve();
            }, 250);
        });
    }
}