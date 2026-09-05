public class BuildInMethoden {
    public static void main(String[] args) {
        String text = "Java lernen";

        int laenge = text.length();
        String gross = text.toUpperCase();
        boolean enthaeltJava = text.contains("Java");

        System.out.println("Länge: " + laenge);
        System.out.println("Großschrift: " + gross);
        System.out.println("Enthält Java: " + enthaeltJava);
    }
}
