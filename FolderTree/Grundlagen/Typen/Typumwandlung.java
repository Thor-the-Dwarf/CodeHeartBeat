public class Typumwandlung {
    public static void main(String[] args) {
        int ganzeZahl = 7;
        double automatisch = ganzeZahl;

        double kommazahl = 9.8;
        int abgeschnitten = (int) kommazahl;

        System.out.println("Automatische Umwandlung gelungen: " + (automatisch == 7.0));
        System.out.println("Explizit: " + abgeschnitten);
    }
}
