public class Wrapperklassen {
    public static void main(String[] args) {
        Integer objektZahl = Integer.valueOf("42");
        int primitiveZahl = objektZahl;

        System.out.println("Integer-Objekt: " + objektZahl);
        System.out.println("Autoboxing-Ergebnis: " + (primitiveZahl * 2));
    }
}
