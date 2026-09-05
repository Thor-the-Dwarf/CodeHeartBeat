public class ThisUndStatic {
    private static int anzahlObjekte = 0;
    private final String name;

    public ThisUndStatic(String name) {
        this.name = name;
        anzahlObjekte++;
    }

    public String getName() {
        return this.name;
    }

    public static int getAnzahlObjekte() {
        return anzahlObjekte;
    }
}
