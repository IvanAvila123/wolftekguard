<?php

namespace Database\Seeders;

use App\Models\InventarioItem;
use Illuminate\Database\Seeder;

class InventarioItemSeeder extends Seeder
{
    /**
     * Equipment catalog from the WolftekGuard v2 prototype.
     *
     * @var list<array{0: string, 1: string, 2: string, 3: int, 4: int, 5: int, 6: string, 7: string}>
     */
    private const INVENTORY = [
        ['APPLE', 'N.I1164LN', 'APPLE IPHONE 11 64GB NEGRO CON CABLE DE LIGHTNING A USB-C ATT', 161, 0, 0, 'IPHONE 11 64GB', 'NEGRO'],
        ['APPLE', 'N.I1164LB', 'APPLE IPHONE 11 64GB BLANCO ATT', 22, 0, 0, 'IPHONE 11 64GB', 'BLANCO'],
        ['APPLE', 'N.IP17256GL', 'APPLE IPHONE 17 256GB LAVANDA ATT', 0, 0, 0, 'IPHONE 17 256GB', 'LAVANDA'],
        ['APPLE', 'N.IP17256GN', 'APPLE IPHONE 17 256GB NEGRO ATT', 0, 0, 0, 'IPHONE 17 256GB', 'NEGRO'],
        ['APPLE', 'N.IP17256GB', 'APPLE IPHONE 17 256GB BLANCO ATT', 48, 6, 0, 'IPHONE 17 256GB', 'BLANCO'],
        ['APPLE', 'N.IP17256GS', 'APPLE IPHONE 17 256GB AZUL NIEBLA ATT', 2, 0, 0, 'IPHONE 17 256GB', 'AZUL NIEBLA'],
        ['APPLE', 'N.IP17PR256GA', 'APPLE IPHONE 17 PRO 256GB AZUL PROFUNDO ATT', 154, 0, 0, 'IPHONE 17 PRO 256GB', 'AZUL PROFUNDO'],
        ['APPLE', 'N.IP17PR256GP', 'APPLE IPHONE 17 PRO 256GB PLATA ATT', 25, 0, 0, 'IPHONE 17 PRO 256GB', 'PLATA'],
        ['APPLE', 'N.IP17PR256GC', 'APPLE IPHONE 17 PRO 256GB NARANJA COSMICO ATT', 0, 0, 0, 'IPHONE 17 PRO 256GB', 'NARANJA COSMICO'],
        ['APPLE', 'N.IP17PRMX256GA', 'APPLE IPHONE 17 PRO MAX 256GB AZUL PROFUNDO ATT', 72, 0, 0, 'IPHONE 17 PRO MAX 256GB', 'AZUL PROFUNDO'],
        ['APPLE', 'N.IP17PRMX256GN', 'APPLE IPHONE 17 PRO MAX 256GB NARANJA COSMICO ATT', 315, 0, 0, 'IPHONE 17 PRO MAX 256GB', 'NARANJA COSMICO'],
        ['APPLE', 'N.IP17PRMX256GP', 'APPLE IPHONE 17 PRO MAX 256GB PLATA ATT', 344, 0, 0, 'IPHONE 17 PRO MAX 256GB', 'PLATA'],
        ['APPLE', 'N.IP18PR256GB', 'APPLE IPHONE 18 PRO 256GB BORGOÑA ATT', 0, 0, 0, 'IPHONE 18 PRO 256GB', 'BORGOÑA'],
        ['SAMSUNG', 'N.SMS25U256GN', 'SAMSUNG GALAXY S25 ULTRA 256GB NEGRO ATT', 88, 12, 6, 'GALAXY S25 ULTRA 256GB', 'NEGRO'],
        ['SAMSUNG', 'N.SMS25U256GT', 'SAMSUNG GALAXY S25 ULTRA 256GB TITANIO ATT', 0, 0, 0, 'GALAXY S25 ULTRA 256GB', 'TITANIO'],
        ['SAMSUNG', 'N.SMA56128GG', 'SAMSUNG GALAXY A56 128GB GRIS ATT', 140, 35, 22, 'GALAXY A56 128GB', 'GRIS'],
        ['SAMSUNG', 'N.SMA56128GL', 'SAMSUNG GALAXY A56 128GB LILA ATT', 30, 0, 0, 'GALAXY A56 128GB', 'LILA'],
        ['MOTOROLA', 'N.MTG85256GA', 'MOTOROLA MOTO G85 256GB AZUL ATT', 18, 4, 0, 'MOTO G85 256GB', 'AZUL'],
        ['HUAWEI', 'N.HWN12128GN', 'HUAWEI NOVA 12 128GB NEGRO ATT', 9, 0, 3, 'NOVA 12 128GB', 'NEGRO'],
        ['HONOR', 'N.HOX5DMN', 'HONOR X5D MIDNIGTH BLACK ATT', 64, 10, 0, 'HONOR X5D', 'MIDNIGHT BLACK'],
        ['HONOR', 'N.HOX5DVO', 'HONOR X5D VERDE OCEANO ATT', 0, 0, 0, 'HONOR X5D', 'VERDE OCEANO'],
    ];

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        foreach (self::INVENTORY as [$oem, $sku, $nombre, $mex, $gdl, $mty, $modelo, $color]) {
            $item = InventarioItem::updateOrCreate(['sku' => $sku], compact('oem', 'nombre', 'modelo', 'color'));

            foreach (array_combine(InventarioItem::ALMACENES, [$mex, $gdl, $mty]) as $almacen => $cantidad) {
                $item->stocks()->updateOrCreate(['almacen' => $almacen], ['cantidad' => $cantidad]);
            }
        }
    }
}
